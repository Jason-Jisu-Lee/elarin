export async function getSession() {
  const r = await fetch("/api/auth/session", {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  return r.ok ? r.json() : { authenticated: false };
}
export async function signup(email, password) {
  const r = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return r.json();
}
export async function login(email, password) {
  const r = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return r.json();
}
export async function logout() {
  const r = await fetch("/api/auth/logout", { method: "POST" });
  return r.json();
}
