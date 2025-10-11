/**
 * GET /api/sentences
 * Cloudflare Pages Function. Fetches JSON from GitHub using server-side token.
 */
export async function onRequestGet({ request, env }) {
  const GITHUB_URL =
    "https://api.github.com/repos/Jason-Jisu-Lee/elarin-atlas/contents/philosophy/general/set_001.json";

  try {
    // Cache by the incoming request
    const cache = caches.default;
    const cacheKey = new Request(new URL(request.url), request);
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    const gh = await fetch(GITHUB_URL, {
      headers: {
        "Accept": "application/vnd.github.v3.raw",
        "Authorization": `token ${env.GITHUB_TOKEN}`,
        "User-Agent": "elarin-worker"
      }
    });

    if (!gh.ok) {
      return new Response(
        JSON.stringify({ error: "GitHub fetch failed" }),
        { status: gh.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // Raw file is JSON; parse then re-emit as JSON with proper headers
    const data = await gh.json();

    const resp = new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300, s-maxage=300" // 5 min
      }
    });

    await cache.put(cacheKey, resp.clone());
    return resp;
  } catch (err) {
    console.error("API error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
