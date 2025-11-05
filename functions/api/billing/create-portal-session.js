export const onRequestPost = async ({ request, env }) => {
  try {
    const user = await getUserFromSession(request, env);
    if (!user) return jerr(401, "Not authenticated.");

    const DB = env.elarin_db || env.ELARIN_DB;
    const secret = env.STRIPE_SECRET_KEY || env.stripe_secret_key;
    const returnUrl =
      env.STRIPE_SUCCESS_URL ||
      env.stripe_success_url ||
      "https://elarin.us/account/";
    if (!DB || !secret) return jerr(500, "Stripe or DB config missing.");

    // Ensure Stripe customer exists
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const body = new URLSearchParams({ email: user.email });
      const r = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body,
      });
      const cj = await r.json();
      if (!r.ok || !cj?.id)
        return jerr(502, cj?.error?.message || "Stripe error.");
      customerId = cj.id;
      await DB.prepare("UPDATE users SET stripe_customer_id = ? WHERE id = ?")
        .bind(customerId, user.id)
        .run();
    }

    // Create Billing Portal Session
    const params = new URLSearchParams({
      customer: customerId,
      return_url: returnUrl,
    });

    const resp = await fetch(
      "https://api.stripe.com/v1/billing_portal/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: params,
      }
    );
    const data = await resp.json();
    if (!resp.ok || !data?.url)
      return jerr(502, data?.error?.message || "Stripe error.");

    return json({ ok: true, url: data.url });
  } catch {
    return jerr(500, "Server error.");
  }
};

/* Shared helpers */
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
function jerr(code, msg) {
  return json({ ok: false, error: msg }, code);
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
async function getUserFromSession(request, env) {
  const sid = getCookie(request.headers.get("Cookie"), "elarin_sess");
  if (!sid) return null;
  const kv = env.ELARIN_SESSIONS || env.elarin_sessions;
  const raw = await kv.get(sid);
  const sess = safeJSON(raw);
  if (!sess?.user_id) return null;

  const DB = env.elarin_db || env.ELARIN_DB;
  if (!DB) return null;
  return await DB.prepare(
    "SELECT id, email, stripe_customer_id FROM users WHERE id = ?"
  )
    .bind(sess.user_id)
    .first();
}
