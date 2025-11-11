export const onRequestPost = async ({ request, env }) => {
  const secret = env.STRIPE_WEBHOOK_SECRET || env.stripe_webhook_secret;
  if (!secret)
    return json({ ok: false, error: "Missing STRIPE_WEBHOOK_SECRET" }, 500);

  // 1) Verify signature
  const raw = await request.text(); // do not JSON.parse before verify
  const sig = request.headers.get("stripe-signature") || "";
  const ts = getSigPart(sig, "t");
  const v1s = getSigParts(sig, "v1");
  if (!ts || !v1s.length)
    return json({ ok: false, error: "Bad signature" }, 400);

  // 5-minute tolerance
  const skewOk = Math.abs(Date.now() / 1000 - Number(ts)) <= 300;
  if (!skewOk)
    return json({ ok: false, error: "Timestamp outside tolerance" }, 400);

  const signedPayload = `${ts}.${raw}`;
  const expected = await hmacSha256Hex(secret, signedPayload);
  if (!v1s.some((s) => timingSafeEq(s, expected)))
    return json({ ok: false, error: "Signature mismatch" }, 400);

  // 2) Handle event
  const evt = safeJSON(raw);
  if (!evt?.type) return json({ ok: false, error: "Invalid payload" }, 400);

  try {
    switch (evt.type) {
      case "checkout.session.completed":
        // fallback to active; then refine via subscription fetch
        if (evt.data?.object?.mode === "subscription") {
          const customer = evt.data.object.customer;
          const subId = evt.data.object.subscription;
          await upsertFromSubscriptionId(env, customer, subId);
        }
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = evt.data?.object;
        await upsertSubscription(env, sub);
        break;
      }

      default:
        // ignore other events
        break;
    }
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: e?.message || "Webhook error" }, 500);
  }
};

/* ---- helpers ---- */
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
function safeJSON(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function getSigPart(h, key) {
  const m = h.match(new RegExp(`${key}=([^,]+)`));
  return m ? m[1] : null;
}
function getSigParts(h, key) {
  const out = [];
  for (const p of h.split(","))
    if (p.trim().startsWith(`${key}=`)) out.push(p.split("=")[1]);
  return out;
}
async function hmacSha256Hex(secret, msg) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
function timingSafeEq(a, b) {
  if (a.length !== b.length) return false;
  let res = 0;
  for (let i = 0; i < a.length; i++) res |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return res === 0;
}

async function upsertFromSubscriptionId(env, customerId, subId) {
  if (!customerId || !subId) return;
  const secret = env.STRIPE_SECRET_KEY || env.stripe_secret_key;
  const r = await fetch(`https://api.stripe.com/v1/subscriptions/${subId}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const sub = await r.json();
  if (!r.ok || !sub?.id)
    throw new Error(sub?.error?.message || "Stripe fetch failed");
  await upsertSubscription(env, sub, customerId);
}

async function upsertSubscription(env, subObj, customerOverride) {
  const DB = env.elarin_db || env.ELARIN_DB;
  if (!DB) throw new Error("Missing DB");

  const customer = customerOverride || subObj?.customer;
  const status = subObj?.status || "incomplete";
  const current_period_end = subObj?.current_period_end
    ? new Date(subObj.current_period_end * 1000).toISOString()
    : null;
  const price_id = subObj?.items?.data?.[0]?.price?.id || null;

  // locate user by customer id
  const user = await DB.prepare(
    "SELECT id FROM users WHERE stripe_customer_id = ?"
  )
    .bind(customer)
    .first();
  if (!user?.id) return;

  // upsert subscriptions row
  const exists = await DB.prepare(
    "SELECT user_id FROM subscriptions WHERE user_id = ?"
  )
    .bind(user.id)
    .first();
  if (exists) {
    await DB.prepare(
      "UPDATE subscriptions SET status=?, current_period_end=?, price_id=?, updated_at=CURRENT_TIMESTAMP WHERE user_id=?"
    )
      .bind(status, current_period_end, price_id, user.id)
      .run();
  } else {
    await DB.prepare(
      "INSERT INTO subscriptions (user_id,status,current_period_end,price_id,created_at,updated_at) VALUES (?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)"
    )
      .bind(user.id, status, current_period_end, price_id)
      .run();
  }

  // audit event
  await DB.prepare(
    "INSERT INTO events (id,user_id,type,payload,ts) VALUES (?,?,?,?,CURRENT_TIMESTAMP)"
  )
    .bind(
      crypto.randomUUID(),
      user.id,
      "subscription_sync",
      JSON.stringify({ status, price_id })
    )
    .run();
}
