/**
 * GET /api/sentences?bust=timestamp
 * Cloudflare Pages Function. Fetches JSON from GitHub using server-side token.
 * Honors ?bust=... or request "cache-control: no-cache" to bypass caches.default.
 */
export async function onRequestGet({ request, env }) {
  const GITHUB_URL =
    "https://api.github.com/repos/Jason-Jisu-Lee/elarin-atlas/contents/philosophy/general/set_001.json";

  const url = new URL(request.url);
  const noCache =
    url.searchParams.has("bust") ||
    (request.headers.get("cache-control") || "").toLowerCase().includes("no-cache");

  try {
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), request);

    if (!noCache) {
      const cached = await cache.match(cacheKey);
      if (cached) return cached;
    }

    const gh = await fetch(GITHUB_URL, {
      headers: {
        Accept: "application/vnd.github.v3.raw",
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        "User-Agent": "elarin-worker"
      }
    });

    if (!gh.ok) {
      return new Response(JSON.stringify({ error: "GitHub fetch failed" }), {
        status: gh.status,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Raw file is JSON text; parse -> re-emit
    const data = await gh.json();

    const headers = {
      "Content-Type": "application/json",
      "Cache-Control": noCache ? "no-store" : "public, max-age=300, s-maxage=300"
    };
    const resp = new Response(JSON.stringify(data), { headers });

    if (!noCache) await cache.put(cacheKey, resp.clone());
    return resp;
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
