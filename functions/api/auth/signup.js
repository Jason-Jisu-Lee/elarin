export const onRequestPost = async ({ request, env }) => {
  try {
    const { email, password } = await request.json().catch(() => ({}));
    if (!isEmail(email) || !isGoodPass(password)) {
      return jerr(400, "Invalid email or password.");
    }

    const DB = env.elarin_db || env.ELARIN_DB;
    const SESS = env.ELARIN_SESSIONS;
    if (!DB) return jerr(500, "DB binding missing.");
    if (!SESS) return jerr(500, "KV binding missing.");

    const exists = await DB.prepare("SELECT id FROM users WHERE email = ?").get(
      email
    );
    if (exists) return jerr(409, "Email already registered.");

    const { hash, salt, i } = await hashPassword(password); // reduced cost
    const id = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    await DB.batch([
      DB.prepare(
        "INSERT INTO users (id,email,password_hash,created_at,updated_at) VALUES (?,?,?,?,?)"
      ).bind(id, email, `pbkdf2$sha256$${i}$${salt}$${hash}`, nowIso, nowIso),
      DB.prepare("INSERT INTO profiles (user_id,onboarded) VALUES (?,0)").bind(
        id
      ),
      DB.prepare(
        "INSERT INTO subscriptions (user_id,status) VALUES (?,?)"
      ).bind(id, "incomplete"),
      DB.prepare("INSERT INTO preferences (user_id) VALUES (?)").bind(id),
    ]);

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
    return jerr(500, "Server error.");
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
  const i = 10000; // lowered for Workers Free CPU
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
