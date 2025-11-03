// Cloudflare Pages Function: /api/health
export const onRequest = async ({ request, env }) => {
  // Support either binding name: ELARIN_DB or elarin_db
  const DB = env.ELARIN_DB || env.elarin_db;
  const KV_SESS = env.ELARIN_SESSIONS || env.elarin_sessions;
  const KV_NEWS = env.ELARIN_NEWS_CACHE || env.elarin_news_cache;

  const host = new URL(request.url).hostname;
  const environment = /\.pages\.dev$/.test(host) ? "preview" : "production";

  // Quick binding checks
  const bindings = {
    hasD1: !!DB && typeof DB.prepare === "function",
    hasKVSessions: !!KV_SESS,
    hasKVNewsCache: !!KV_NEWS,
  };

  // Optional D1 smoke test (no schema required)
  let d1Ok = null;
  try {
    if (bindings.hasD1) {
      const row = await DB.prepare("SELECT 1 AS ok;").first();
      d1Ok = row?.ok === 1;
    }
  } catch {
    d1Ok = false;
  }

  const body = {
    ok: true,
    environment,
    bindings,
    d1Ok,
    time: new Date().toISOString(),
  };

  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
};
