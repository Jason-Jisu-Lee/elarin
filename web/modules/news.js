async function read(r) {
  const ct = r.headers.get("content-type") || "";
  if (ct.includes("application/json")) return r.json();
  const txt = await r.text();
  return { ok: false, error: txt?.slice(0, 200) || "Server error" };
}

export async function getFeed({ refresh = false } = {}) {
  const url = refresh ? "/api/news/feed?refresh=1" : "/api/news/feed";
  const r = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  return read(r);
}
