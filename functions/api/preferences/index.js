export const onRequest = async ({ request, env }) => {
  try {
    const method = request.method.toUpperCase();
    if (method === "GET") return handleGet(request, env);
    if (method === "PUT") return handlePut(request, env);
    return json({ ok: false, error: "Method not allowed" }, 405);
  } catch (e) {
    return json({ ok: false, error: "Server error" }, 500);
  }
};

/* ---------- GET /api/preferences ---------- */
async function handleGet(request, env) {
  const user = await getUserFromSession(request, env);
  if (!user) return json({ ok: false, error: "Not authenticated" }, 401);

  const DB = env.elarin_db || env.ELARIN_DB;
  const row = await DB.prepare(
    "SELECT topics, sources, intensity FROM preferences WHERE user_id = ?"
  )
    .bind(user.id)
    .first();

  const prefs = normalizePrefs(row);
  return json({ ok: true, preferences: prefs });
}

/* ---------- PUT /api/preferences ---------- */
async function handlePut(request, env) {
  const user = await getUserFromSession(request, env);
  if (!user) return json({ ok: false, error: "Not authenticated" }, 401);

  const body = await safeJSON(await request.text());
  if (!body) return json({ ok: false, error: "Invalid JSON" }, 400);

  const next = sanitizeIncoming(body);
  if (!next.ok) return json({ ok: false, error: next.error }, 400);

  const DB = env.elarin_db || env.ELARIN_DB;
  await DB.prepare(
    "UPDATE preferences SET topics=?, sources=?, intensity=?, last_updated=CURRENT_TIMESTAMP WHERE user_id = ?"
  )
    .bind(
      JSON.stringify(next.value.topics),
      JSON.stringify(next.value.sources),
      next.value.intensity,
      user.id
    )
    .run();

  return json({ ok: true, preferences: next.value });
}

/* ---------- helpers ---------- */
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
async function getUserFromSession(request, env) {
  const sid = getCookie(request.headers.get("Cookie"), "elarin_sess");
  if (!sid) return null;
  const kv = env.ELARIN_SESSIONS || env.elarin_sessions;
  const raw = await kv.get(sid);
  const sess = safeJSON(raw);
  if (!sess?.user_id) return null;

  const DB = env.elarin_db || env.ELARIN_DB;
  return await DB.prepare("SELECT id, email FROM users WHERE id = ?")
    .bind(sess.user_id)
    .first();
}
function getCookie(header, name) {
  if (!header) return null;
  const m = header.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}
function safeJSON(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

const DEFAULT_TOPICS = [
  "us-politics",
  "us-economy",
  "world",
  "science",
  "nature",
];
const DEFAULT_SOURCES = {}; // keep empty for now; we’ll grow this in Phase 9
const DEFAULT_INTENSITY = 3;

function normalizePrefs(row) {
  const topics =
    (row?.topics &&
      Array.isArray(tryParse(row.topics)) &&
      tryParse(row.topics)) ||
    DEFAULT_TOPICS;
  const sources =
    (row?.sources &&
      typeof tryParse(row.sources) === "object" &&
      tryParse(row.sources)) ||
    DEFAULT_SOURCES;
  const intensity =
    typeof row?.intensity === "number" &&
    row.intensity >= 1 &&
    row.intensity <= 5
      ? row.intensity
      : DEFAULT_INTENSITY;
  return { topics, sources, intensity };
}
function tryParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
function sanitizeIncoming(body) {
  const topicsIn = Array.isArray(body.topics) ? body.topics : null;
  const allowed = new Set(["us-politics", "us-economy", "world", "science"]);
  const topics =
    topicsIn && topicsIn.length
      ? [...new Set(topicsIn.map(String))].filter((t) => allowed.has(t))
      : DEFAULT_TOPICS;

  let intensity = Number(body.intensity);
  if (!Number.isFinite(intensity)) intensity = DEFAULT_INTENSITY;
  if (intensity < 1) intensity = 1;
  if (intensity > 5) intensity = 5;

  // sources optional in Phase 8; accept object or default to empty
  const sources =
    typeof body.sources === "object" && body.sources
      ? body.sources
      : DEFAULT_SOURCES;

  return { ok: true, value: { topics, sources, intensity } };
}
