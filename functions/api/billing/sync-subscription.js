// POST /api/billing/sync-subscription
// Auth required. Reads Stripe for the current user and updates D1.subscriptions.
// Safe to call multiple times. Idempotent.

export const onRequestPost = async ({ request, env }) => {
  try {
    const user = await getUserFromSession(request, env);
    if (!user) return jerr(401, "Not authenticated.");

    const DB = env.elarin_db || env.ELARIN_DB;
    const SECRET = env.STRIPE_SECRET_KEY || env.stripe_secret_key;
    if (!DB || !SECRET)
      return jerr(500, "Missing ELARIN_DB or STRIPE_SECRET_KEY.");

    // 1) Ensure we know the Stripe customer id
    let customerId = user.stripe_customer_id;

    if (!customerId) {
      // Try to find a Stripe customer by email (Stripe supports filtering by email)
      const r = await fetch(
        "https://api.stripe.com/v1/customers?limit=5&email=" +
          encodeURIComponent(user.email),
        {
          headers: { Authorization: `Bearer ${SECRET}` },
        }
      );
      const data = await r.json();
      if (!r.ok)
        return jerr(
          502,
          data?.error?.message || "Stripe error listing customers."
        );
      customerId = data?.data?.[0]?.id || null;
      if (customerId) {
        await DB.prepare("UPDATE users SET stripe_customer_id = ? WHERE id = ?")
          .bind(customerId, user.id)
          .run();
      }
    }

    if (!customerId) {
      // No Stripe customer found yet. User likely did not finish Checkout.
      await upsertSub(DB, user.id, "incomplete", null, null);
      return json({ ok: true, status: "incomplete", customerId: null });
    }

    // 2) Pull subscriptions for that customer (all statuses)
    const rs = await fetch(
      "https://api.stripe.com/v1/subscriptions?customer=" +
        encodeURIComponent(customerId) +
        "&status=all&limit=10",
      { headers: { Authorization: `Bearer ${SECRET}` } }
    );
    const subs = await rs.json();
    if (!rs.ok)
      return jerr(
        502,
        subs?.error?.message || "Stripe error listing subscriptions."
      );

    // Pick the most relevant subscription:
    // prefer active, then trialing, then past_due, then incomplete/incomplete_expired, then canceled/unpaid by recency
    const sortRank = (s) => {
      const order = {
        active: 6,
        trialing: 5,
        past_due: 4,
        unpaid: 3,
        incomplete: 2,
        incomplete_expired: 1,
        canceled: 0,
      };
      return (order[s?.status] ?? 0) * 1_000_000 + (s?.created ?? 0);
    };

    let best = null;
    for (const s of subs?.data || []) {
      if (!best || sortRank(s) > sortRank(best)) best = s;
    }

    if (!best) {
      await upsertSub(DB, user.id, "incomplete", null, null);
      return json({ ok: true, status: "incomplete", customerId });
    }

    const status = best.status || "incomplete";
    const cpe = best.current_period_end
      ? new Date(best.current_period_end * 1000).toISOString()
      : null;
    const priceId = best.items?.data?.[0]?.price?.id || null;

    // 3) Write back to D1
    await upsertSub(DB, user.id, status, cpe, priceId);

    // 4) Audit event
    await DB.prepare(
      "INSERT INTO events (id,user_id,type,payload,ts) VALUES (?,?,?,?,CURRENT_TIMESTAMP)"
    )
      .bind(
        crypto.randomUUID(),
        user.id,
        "subscription_sync_manual",
        JSON.stringify({ status, price_id: priceId })
      )
      .run();

    return json({ ok: true, status, customerId });
  } catch (e) {
    return jerr(500, "Server error.");
  }
};

/* ---------------- helpers ---------------- */
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
function safeJSON(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
function getCookie(header, name) {
  if (!header) return null;
  const m = header.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}
async function getUserFromSession(request, env) {
  const sid = getCookie(request.headers.get("Cookie"), "elarin_sess");
  if (!sid) return null;
  const kv = env.ELARIN_SESSIONS || env.elarin_sessions;
  const raw = await kv.get(sid);
  const sess = safeJSON(raw);
  if (!sess?.user_id) return null;
  const DB = env.elarin_db || env.ELARIN_DB;
  return await DB.prepare(
    "SELECT id, email, stripe_customer_id FROM users WHERE id = ?"
  )
    .bind(sess.user_id)
    .first();
}
async function upsertSub(DB, userId, status, current_period_end, price_id) {
  const row = await DB.prepare(
    "SELECT user_id FROM subscriptions WHERE user_id = ?"
  )
    .bind(userId)
    .first();
  if (row) {
    await DB.prepare(
      "UPDATE subscriptions SET status=?, current_period_end=?, price_id=?, updated_at=CURRENT_TIMESTAMP WHERE user_id=?"
    )
      .bind(status, current_period_end, price_id, userId)
      .run();
  } else {
    await DB.prepare(
      "INSERT INTO subscriptions (user_id,status,current_period_end,price_id,created_at,updated_at) VALUES (?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)"
    )
      .bind(userId, status, current_period_end, price_id)
      .run();
  }
}
