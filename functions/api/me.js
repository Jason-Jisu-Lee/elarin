export const onRequest = async ({ request, env }) => {
  const sid = getCookie(request.headers.get("Cookie"), "elarin_sess");
  if (!sid) return json({ authenticated: false, subscribed: false });

  const kv = env.ELARIN_SESSIONS || env.elarin_sessions;
  const raw = await kv.get(sid);
  const sess = safeJSON(raw);
  if (!sess?.user_id) return json({ authenticated: false, subscribed: false });

  const DB = env.elarin_db || env.ELARIN_DB;
  const row = await DB.prepare(
    "SELECT s.status AS status FROM subscriptions s WHERE s.user_id = ?"
  )
    .bind(sess.user_id)
    .first();
  const subscribed = row?.status === "active";
  return json({ authenticated: true, subscribed });
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
function getCookie(h, name) {
  if (!h) return null;
  const m = h.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}
function safeJSON(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
