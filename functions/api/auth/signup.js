export const onRequestPost = async ({ request, env }) => {
  const preview = /\.pages\.dev$/.test(new URL(request.url).hostname);
  try {
    const { email, password, turnstileToken } = await request
      .json()
      .catch(() => ({}));
    if (!isEmail(email) || !isGoodPass(password))
      return jerr(400, "Invalid email or password.");

    const DB = env.elarin_db || env.ELARIN_DB;
    const SESS = env.ELARIN_SESSIONS || env.elarin_sessions;
    if (!DB) return jerr(500, "DB binding missing.");
    if (!SESS) return jerr(500, "KV binding missing.");

    // basic rate-limit: IP + email
    const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
    if (!(await take(SESS, `rl:signup:ip:${ip}`, 5, 600)))
      return jerr(429, "Too many attempts. Try later.");
    if (!(await take(SESS, `rl:signup:email:${email}`, 3, 600)))
      return jerr(429, "Too many attempts. Try later.");

    // Turnstile verify if configured
    const TS_SECRET = env.TURNSTILE_SECRET_KEY || env.turnstile_secret_key;
    if (TS_SECRET) {
      if (!turnstileToken) return jerr(400, "Verification required.");
      const ok = await verifyTurnstile(TS_SECRET, turnstileToken, ip);
      if (!ok) return jerr(400, "Verification failed.");
    }

    const exists = await DB.prepare("SELECT id FROM users WHERE email = ?")
      .bind(email)
      .first();
    if (exists) return jerr(409, "Email already registered.");

    const { hash, salt, i } = await hashPassword(password);
    const id = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    await DB.prepare(
      "INSERT INTO users (id,email,password_hash,created_at,updated_at) VALUES (?,?,?,?,?)"
    )
      .bind(id, email, `pbkdf2$sha256$${i}$${salt}$${hash}`, nowIso, nowIso)
      .run();

    await DB.prepare("INSERT INTO profiles (user_id,onboarded) VALUES (?,0)")
      .bind(id)
      .run();
    await DB.prepare("INSERT INTO subscriptions (user_id,status) VALUES (?,?)")
      .bind(id, "incomplete")
      .run();
    await DB.prepare("INSERT INTO preferences (user_id) VALUES (?)")
      .bind(id)
      .run();

    const sid = genSessionId();
    await SESS.put(sid, JSON.stringify({ user_id: id }), {
      expirationTtl: 60 * 60 * 24 * 7,
    });

    return new Response(JSON.stringify({ ok: true, user: { id, email } }), {
      status: 201,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "set-cookie": cookie("elarin_sess", sid, 7 * 24 * 3600),
      },
    });
  } catch (err) {
    return jerr(
      500,
      preview ? `Server error: ${err?.message || err}` : "Server error."
    );
  }
};

function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
}
function isGoodPass(v) {
  return typeof v === "string" && v.length >= 8;
}
function cookie(name, value, maxAge) {
  return `${name}=${encodeURIComponent(
    value
  )}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
function jerr(code, msg) {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status: code,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
function genSessionId() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes)).replace(/[^A-Za-z0-9]/g, "");
}
function enc(s) {
  return new TextEncoder().encode(s);
}
function b64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}
async function hashPassword(password) {
  const i = 10000;
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    enc(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations: i },
    key,
    256
  );
  return { hash: b64(new Uint8Array(bits)), salt: b64(saltBytes), i };
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
      {
        method: "POST",
        body: form,
      }
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
