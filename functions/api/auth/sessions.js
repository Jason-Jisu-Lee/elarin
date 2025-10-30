export const onRequest = async ({ request, env }) => {
  const sid = getCookie(request.headers.get("Cookie"), "elarin_sess");
  if (!sid) return json({ authenticated: false });

  const raw = await env.ELARIN_SESSIONS.get(sid);
  if (!raw) return json({ authenticated: false });

  const sess = safeJSON(raw);
  if (!sess?.user_id) return json({ authenticated: false });

  const DB = env.elarin_db || env.ELARIN_DB;
  const user = await DB.prepare("SELECT id, email FROM users WHERE id = ?").get(
    sess.user_id
  );

  if (!user) return json({ authenticated: false });

  const sub = await DB.prepare(
    "SELECT status FROM subscriptions WHERE user_id = ?"
  ).get(user.id);

  const subscribed = sub?.status === "active";
  return json({ authenticated: true, subscribed, user });
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
