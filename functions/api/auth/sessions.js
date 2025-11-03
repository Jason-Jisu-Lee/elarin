export const onRequest = async ({ request, env }) => {
  try {
    const sid = getCookie(request.headers.get("Cookie"), "elarin_sess");
    if (!sid) return json({ authenticated: false });

    const raw = await (env.ELARIN_SESSIONS || env.elarin_sessions).get(sid);
    if (!raw) return json({ authenticated: false });

    const sess = safeJSON(raw);
    if (!sess?.user_id) return json({ authenticated: false });

    const DB = env.elarin_db || env.ELARIN_DB;
    if (!DB) return json({ authenticated: false });

    const user = await DB.prepare("SELECT id, email FROM users WHERE id = ?")
      .bind(sess.user_id)
      .first();
    if (!user) return json({ authenticated: false });

    const sub = await DB.prepare(
      "SELECT status FROM subscriptions WHERE user_id = ?"
    )
      .bind(user.id)
      .first();

    const subscribed = sub?.status === "active";
    return json({ authenticated: true, subscribed, user });
  } catch {
    return json({ authenticated: false });
  }
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
