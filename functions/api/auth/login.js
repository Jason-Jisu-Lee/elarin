export const onRequestPost = async ({ request, env }) => {
  const { email, password } = await request.json().catch(() => ({}));
  if (!email || !password) return err(400, "Missing credentials.");

  const DB = env.elarin_db || env.ELARIN_DB;
  const row = await DB.prepare(
    "SELECT id, password_hash FROM users WHERE email = ?"
  ).get(email);
  if (!row?.password_hash) return err(401, "Invalid email or password.");

  const ok = await verifyPassword(password, row.password_hash);
  if (!ok) return err(401, "Invalid email or password.");

  const sid = genSessionId();
  await env.ELARIN_SESSIONS.put(sid, JSON.stringify({ user_id: row.id }), {
    expirationTtl: 60 * 60 * 24 * 7,
  });

  return new Response(
    JSON.stringify({ ok: true, user: { id: row.id, email } }),
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "set-cookie": cookie("elarin_sess", sid, 7 * 24 * 3600),
      },
    }
  );
};

function err(code, message) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status: code,
    headers: { "content-type": "application/json; charset=utf-8" },
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
function b64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

async function verifyPassword(password, stored) {
  // format: pbkdf2$sha256$ITER$SALT$HASH
  const parts = String(stored).split("$");
  if (parts.length !== 5) return false;
  const iter = parseInt(parts[2], 10);
  const salt = atob(parts[3]);
  const saltBytes = new Uint8Array([...salt].map((c) => c.charCodeAt(0)));
  const key = await crypto.subtle.importKey(
    "raw",
    enc(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations: iter },
    key,
    256
  );
  const hash = btoa(String.fromCharCode(...new Uint8Array(bits)));
  return hash === parts[4];
}

function genSessionId() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return b64(bytes).replace(/[^A-Za-z0-9]/g, "");
}
