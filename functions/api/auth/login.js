export const onRequestPost = async ({ request, env }) => {
  const preview = /\.pages\.dev$/.test(new URL(request.url).hostname);
  try {
    const { email, password } = await request.json().catch(() => ({}));
    if (!email || !password) return jerr(400, "Missing credentials.");

    const DB = env.elarin_db || env.ELARIN_DB;
    const SESS = env.ELARIN_SESSIONS || env.elarin_sessions;
    if (!DB) return jerr(500, "DB binding missing.");
    if (!SESS) return jerr(500, "KV binding missing.");

    const row = await DB.prepare(
      "SELECT id, password_hash FROM users WHERE email = ?"
    )
      .bind(email)
      .first();

    // If user not found or hash missing/invalid, return 401 (do not throw)
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
    // expected: pbkdf2$sha256$ITER$SALT$HASH
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
