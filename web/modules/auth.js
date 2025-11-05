async function read(r) {
  const ct = r.headers.get("content-type") || "";
  if (ct.includes("application/json")) return r.json();
  const txt = await r.text();
  // Surface Workers HTML error pages as text
  return { ok: false, error: txt?.slice(0, 200) || "Server error" };
}

export async function getSession() {
  const r = await fetch("/api/auth/sessions", {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  return r.ok ? read(r) : { authenticated: false };
}

export async function signup(email, password) {
  const r = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return read(r);
}

export async function login(email, password) {
  const r = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return read(r);
}

export async function logout() {
  const r = await fetch("/api/auth/logout", { method: "POST" });
  return read(r);
}
