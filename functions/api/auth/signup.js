export const onRequestPost = async ({ request, env }) => {
  const { email, password } = await request.json().catch(() => ({}));
  if (!validEmail(email) || !validPassword(password)) {
    return err(400, "Invalid email or password.");
  }

  const DB = env.elarin_db || env.ELARIN_DB;

  const exists = await DB.prepare("SELECT id FROM users WHERE email = ?").get(
    email
  );
  if (exists) return err(409, "Email already registered.");

  const { hash, salt, i } = await hashPassword(password);
  const id = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  const tx = await DB.batch([
    DB.prepare(
      "INSERT INTO users (id,email,password_hash,created_at,updated_at) VALUES (?,?,?,?,?)"
    ).bind(id, email, `pbkdf2$sha256$${i}$${salt}$${hash}`, nowIso, nowIso),
    DB.prepare("INSERT INTO profiles (user_id,onboarded) VALUES (?,0)").bind(
      id
    ),
    DB.prepare("INSERT INTO subscriptions (user_id,status) VALUES (?,?)").bind(
      id,
      "incomplete"
    ),
    DB.prepare("INSERT INTO preferences (user_id) VALUES (?)").bind(id),
  ]);

  // session
  const sid = genSessionId();
  await env.ELARIN_SESSIONS.put(sid, JSON.stringify({ user_id: id }), {
    expirationTtl: 60 * 60 * 24 * 7,
  });

  return new Response(JSON.stringify({ ok: true, user: { id, email } }), {
    status: 201,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "set-cookie": cookie("elarin_sess", sid, 7 * 24 * 3600),
    },
  });
};

function err(code, message) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status: code,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
function validEmail(e) {
  return typeof e === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}
function validPassword(p) {
  return typeof p === "string" && p.length >= 8;
}

async function hashPassword(password) {
  const i = 50000; // PBKDF2 iterations; safe under Workers CPU limits
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = b64(saltBytes);
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
  const hash = b64(new Uint8Array(bits));
  return { hash, salt, i };
}
function enc(s) {
  return new TextEncoder().encode(s);
}
function b64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

function genSessionId() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return b64(bytes).replace(/[^A-Za-z0-9]/g, "");
}
function cookie(name, value, maxAge) {
  return `${name}=${encodeURIComponent(
    value
  )}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
