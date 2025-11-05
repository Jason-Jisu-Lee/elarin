async function read(r) {
  const ct = r.headers.get("content-type") || "";
  if (ct.includes("application/json")) return r.json();
  return { ok: false, error: await r.text() };
}

export async function createCheckoutSession() {
  const r = await fetch("/api/billing/create-checkout-session", {
    method: "POST",
    headers: { "content-type": "application/json" },
  });
  return read(r);
}

export async function createPortalSession() {
  const r = await fetch("/api/billing/create-portal-session", {
    method: "POST",
    headers: { "content-type": "application/json" },
  });
  return read(r);
}
