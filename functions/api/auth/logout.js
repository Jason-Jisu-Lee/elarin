export const onRequestPost = async ({ request, env }) => {
  const sid = getCookie(request.headers.get("Cookie"), "elarin_sess");
  if (sid) await env.ELARIN_SESSIONS.delete(sid);
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "set-cookie":
        "elarin_sess=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
    },
  });
};

function getCookie(header, name) {
  if (!header) return null;
  const m = header.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}
