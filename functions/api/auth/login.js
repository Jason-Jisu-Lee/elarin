export const onRequestPost = async ({ request, env }) => {
  const preview = /\.pages\.dev$/.test(new URL(request.url).hostname);
  try {
    const { email, password, turnstileToken } = await request
      .json()
      .catch(() => ({}));
    if (!email || !password) return jerr(400, "Missing credentials.");

    const DB = env.elarin_db || env.ELARIN_DB;
    const SESS = env.ELARIN_SESSIONS || env.elarin_sessions;
    if (!DB) return jerr(500, "DB binding missing.");
    if (!SESS) return jerr(500, "KV binding missing.");

    // rate-limit: IP + email
    const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
    if (!(await take(SESS, `rl:login:ip:${ip}`, 20, 600)))
      return jerr(429, "Too many attempts. Try later.");
    if (!(await take(SESS, `rl:login:email:${email}`, 10, 600)))
      return jerr(429, "Too many attempts. Try later.");

    // Turnstile verify if configured
    const TS_SECRET = env.TURNSTILE_SECRET_KEY || env.turnstile_secret_key;
    if (TS_SECRET) {
      if (!turnstileToken) return jerr(400, "Verification required.");
      const okTS = await verifyTurnstile(TS_SECRET, turnstileToken, ip);
      if (!okTS) return jerr(400, "Verification failed.");
    }

    const row = await DB.prepare(
      "SELECT id, password_hash FROM users WHERE email = ?"
    )
      .bind(email)
      .first();

    if (!row?.password_hash) return jerr(401, "Invalid email or password.");

    const ok = await safeVerifyPassword(password, row.password_hash);
    if (!ok) return jerr(401, "Invalid email or password.");

    const sid = genSessionId();
    await SESS.put(sid, JSON.stringify({ user_id: row.id }), {
      expirationTtl: 60 * 60 * 24 * 7,
    });

    return new Response(
      JSON.stringify({ ok: true, user: { id: row.id, email } }),
      {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
          "set-cookie": cookie("elarin_sess", sid, 7 * 24 * 3600),
        },
      }
    );
  } catch (err) {
    return jerr(
      500,
      preview ? `Server error: ${err?.message || err}` : "Server error."
    );
  }
};

function jerr(code, msg) {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status: code,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
function cookie(name, value, maxAge) {
  return `${name}=${encodeURIComponent(
    value
  )}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
function enc(s) {
  return new TextEncoder().encode(s);
}

/** Never throw. Treat any malformed stored hash as a mismatch. */
async function safeVerifyPassword(password, stored) {
  try {
    const parts = String(stored).split("$");
    if (parts.length !== 5) return false;
    const iter = parseInt(parts[2], 10);
    if (!Number.isFinite(iter) || iter < 1000 || iter > 200000) return false;
    const saltB = Uint8Array.from(atob(parts[3]), (c) => c.charCodeAt(0));
    const key = await crypto.subtle.importKey(
      "raw",
      enc(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt: saltB, iterations: iter },
      key,
      256
    );
    const hash = btoa(String.fromCharCode(...new Uint8Array(bits)));
    return hash === parts[4];
  } catch {
    return false;
  }
}
function genSessionId() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes)).replace(/[^A-Za-z0-9]/g, "");
}

/* ---- Turnstile + rate limit helpers ---- */
async function verifyTurnstile(secret, token, ip) {
  try {
    const form = new URLSearchParams();
    form.set("secret", secret);
    form.set("response", token);
    if (ip) form.set("remoteip", ip);
    const r = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: form }
    );
    const j = await r.json();
    return !!j?.success;
  } catch {
    return false;
  }
}
async function take(KV, key, limit, ttlSeconds) {
  const now = Date.now();
  const raw = await KV.get(key);
  let state = raw ? safeJSON(raw) : null;
  if (!state || !Number.isFinite(state.reset) || now > state.reset) {
    state = { n: 1, reset: now + ttlSeconds * 1000 };
    await KV.put(key, JSON.stringify(state), { expirationTtl: ttlSeconds });
    return true;
  }
  if (state.n >= limit) return false;
  state.n += 1;
  const remainTtl = Math.max(1, Math.floor((state.reset - now) / 1000));
  await KV.put(key, JSON.stringify(state), { expirationTtl: remainTtl });
  return true;
}
function safeJSON(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
