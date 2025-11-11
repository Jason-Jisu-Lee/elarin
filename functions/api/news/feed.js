// GET /api/news/feed
// Requires: active subscription and KV binding ELARIN_NEWS_CACHE
// Reads user preferences (topics, intensity). Falls back to defaults.
// Caches each source feed in KV for 5–15 minutes. Normalizes items.

export const onRequest = async ({ request, env }) => {
  try {
    const user = await getUserFromSession(request, env);
    if (!user) return jerr(401, "Not authenticated.");

    const DB = env.elarin_db || env.ELARIN_DB;
    const CACHE = env.ELARIN_NEWS_CACHE || env.elarin_news_cache;
    if (!DB) return jerr(500, "Missing ELARIN_DB");
    if (!CACHE) return jerr(500, "Missing ELARIN_NEWS_CACHE");

    // Ensure active subscription
    const sub = await DB.prepare(
      "SELECT status FROM subscriptions WHERE user_id = ?"
    )
      .bind(user.id)
      .first();
    if (sub?.status !== "active") return jerr(402, "Subscription required.");

    // Load preferences
    const pref = await DB.prepare(
      "SELECT topics, intensity FROM preferences WHERE user_id = ?"
    )
      .bind(user.id)
      .first();
    const topics = normalizeTopics(pref?.topics);
    const intensity = normalizeIntensity(pref?.intensity);

    // Allow manual refresh (?refresh=1) for debugging
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get("refresh") === "1";

    // Build list of sources per topic
    const srcMap = getSources();
    const wantedSources = [];
    for (const t of topics) {
      const arr = srcMap[t] || [];
      for (const s of arr) wantedSources.push({ topic: t, url: s });
    }

    // Fetch each source with KV caching
    const perSourcePromises = wantedSources.map(({ topic, url }) =>
      getFeedForSource(CACHE, url, topic, forceRefresh)
    );
    const results = await Promise.allSettled(perSourcePromises);

    // Merge, sort by time desc, cap by intensity (default 5*intensity, hard cap 20)
    const items = [];
    for (const r of results) {
      if (r.status === "fulfilled" && Array.isArray(r.value)) {
        items.push(...r.value);
      }
    }
    items.sort((a, b) => {
      const ta = Date.parse(a.published_at || "") || 0;
      const tb = Date.parse(b.published_at || "") || 0;
      return tb - ta;
    });

    const limit = Math.min(20, Math.max(5, intensity * 5));
    const trimmed = items.slice(0, limit);

    return json({ ok: true, items: trimmed });
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

async function getUserFromSession(request, env) {
  const sid = getCookie(request.headers.get("Cookie"), "elarin_sess");
  if (!sid) return null;
  const kv = env.ELARIN_SESSIONS || env.elarin_sessions;
  const raw = await kv.get(sid);
  const sess = safeJSON(raw);
  if (!sess?.user_id) return null;
  const DB = env.elarin_db || env.ELARIN_DB;
  return await DB.prepare("SELECT id, email FROM users WHERE id = ?")
    .bind(sess.user_id)
    .first();
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

function normalizeTopics(raw) {
  const d = ["us-politics", "us-economy", "world", "science"];
  if (!raw) return d;
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.length) {
      const allowed = new Set(d);
      return [...new Set(arr.map(String))].filter((t) => allowed.has(t));
    }
    return d;
  } catch {
    return d;
  }
}
function normalizeIntensity(v) {
  if (typeof v === "number" && v >= 1 && v <= 5) return v;
  return 3;
}

function getSources() {
  // RSS/Atom feeds that are generally fetchable without auth
  return {
    "us-politics": [
      "https://www.reuters.com/politics/us/rss",
      "https://apnews.com/hub/ap-top-news?utm_source=rss",
      "https://www.npr.org/rss/rss.php?id=1014",
      // additions
      "https://www.whitehouse.gov/briefing-room/feed/",
    ],
    "us-economy": [
      "https://www.reuters.com/markets/us/rss",
      "https://www.bls.gov/news.release.rss.htm",
      "https://home.treasury.gov/news/press-releases/rss",
      // additions
      "https://www.federalreserve.gov/feeds/press_all.xml",
      "https://www.bea.gov/news/rss.xml",
      "https://www.fdic.gov/news/press-releases/index.xml",
    ],
    world: [
      "https://www.reuters.com/world/rss",
      "https://apnews.com/hub/world-news?utm_source=rss",
      // additions
      "https://feeds.bbci.co.uk/news/world/rss.xml",
      "https://www.aljazeera.com/xml/rss/all.xml",
      "https://news.un.org/feed/subscribe/en/news/all/rss.xml",
    ],
    science: [
      "https://www.nasa.gov/rss/dyn/breaking_news.rss",
      "https://www.nih.gov/news-events/news-releases/feed",
      "https://www.sciencedaily.com/rss/top/science.xml",
    ],
    nature: [
      "https://www.nature.com/nature/articles?type=news&format=rss",
      "https://www.nsf.gov/rss/rss_www_press.xml",
      "https://www.cdc.gov/media/rss/media.rss",
      "https://www.who.int/rss-feeds/news-english.xml",
      "https://www.noaa.gov/rss.xml",
    ],
  };
}

async function getFeedForSource(CACHE, srcUrl, topic, forceRefresh) {
  const key = "news:src:" + hashKey(srcUrl);
  if (!forceRefresh) {
    const cached = await CACHE.get(key);
    if (cached) {
      try {
        const arr = JSON.parse(cached);
        if (Array.isArray(arr)) return arr;
      } catch {}
    }
  }

  // Fetch fresh
  let text = "";
  try {
    const r = await fetch(srcUrl, {
      headers: { "user-agent": "ElarinFetcher/1.0 (+https://elarin.us)" },
      cf: { cacheTtl: 0, cacheEverything: false },
    });
    text = await r.text();
  } catch {
    return [];
  }
  const parsed = parseFeed(text, srcUrl, topic);

  // Staggered TTL 5–15 minutes to avoid thundering herd
  const ttl = 300 + Math.floor(Math.random() * 600);
  await CACHE.put(key, JSON.stringify(parsed), { expirationTtl: ttl });
  return parsed;
}

function parseFeed(xml, srcUrl, topic) {
  // Handle RSS 2.0 (<item>) and Atom (<entry>) minimally
  const out = [];
  const isAtom = /<feed[\s>]/i.test(xml) && /<entry[\s>]/i.test(xml);
  if (isAtom) {
    const entries = splitTags(xml, "entry");
    for (const e of entries) {
      const title = innerText(e, "title");
      const link = pickAtomLink(e) || innerTextAttr(e, "link", "href") || "";
      const summary = innerText(e, "summary") || innerText(e, "content") || "";
      const published =
        innerText(e, "published") || innerText(e, "updated") || null;
      const image = matchMedia(e) || matchEnclosure(e) || null;

      if (link && title) {
        out.push({
          id: stableId(link),
          source: hostOf(link) || hostOf(srcUrl),
          title: strip(title),
          summary: strip(htmlToText(summary)).slice(0, 400),
          url: link,
          published_at: toISO(published),
          topic,
          image_url: image,
        });
      }
    }
  } else {
    const items = splitTags(xml, "item");
    for (const it of items) {
      const title = innerText(it, "title");
      const link = innerText(it, "link");
      const guid = innerText(it, "guid");
      const desc = innerText(it, "description") || "";
      const pub = innerText(it, "pubDate") || innerText(it, "dc:date") || null;
      const image = matchMedia(it) || matchEnclosure(it) || null;

      const finalLink = firstNonEmpty([link, guid]);
      if (finalLink && title) {
        out.push({
          id: stableId(finalLink),
          source: hostOf(finalLink) || hostOf(srcUrl),
          title: strip(title),
          summary: strip(htmlToText(desc)).slice(0, 400),
          url: finalLink,
          published_at: toISO(pub),
          topic,
          image_url: image,
        });
      }
    }
  }
  return out;
}

/* ----- tiny XML helpers (string-based, robust enough for feeds) ----- */
function splitTags(xml, tag) {
  const re = new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}>`, "gi");
  return xml.match(re) || [];
}
function innerText(block, tag) {
  const m = block.match(
    new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i")
  );
  return m ? decodeXml(m[1]) : "";
}
function innerTextAttr(block, tag, attr) {
  const m = block.match(
    new RegExp(`<${tag}\\b[^>]*\\s${attr}="([^"]+)"[^>]*>`, "i")
  );
  return m ? decodeXml(m[1]) : "";
}
function pickAtomLink(block) {
  // Prefer alternate link
  const alt = block.match(/<link\b[^>]*rel="alternate"[^>]*href="([^"]+)"/i);
  if (alt) return decodeXml(alt[1]);
  const any = block.match(/<link\b[^>]*href="([^"]+)"/i);
  if (any) return decodeXml(any[1]);
  return null;
}
function matchMedia(block) {
  const m1 = block.match(/<media:content[^>]*url="([^"]+)"/i);
  if (m1) return decodeXml(m1[1]);
  const m2 = block.match(/<media:thumbnail[^>]*url="([^"]+)"/i);
  if (m2) return decodeXml(m2[1]);
  return null;
}
function matchEnclosure(block) {
  const m = block.match(
    /<enclosure[^>]*url="([^"]+)"[^>]*type="image\/[^"]*"/i
  );
  return m ? decodeXml(m[1]) : null;
}
function decodeXml(s) {
  return String(s || "")
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
function htmlToText(s) {
  // Remove tags and collapse whitespace
  return String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function strip(s) {
  return String(s || "").trim();
}
function firstNonEmpty(arr) {
  for (const x of arr) if (x && String(x).trim()) return x;
  return "";
}
function toISO(d) {
  if (!d) return null;
  const t = Date.parse(d);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}
function hostOf(u) {
  try {
    return new URL(u).hostname;
  } catch {
    return null;
  }
}
function stableId(link) {
  // Stable ID from URL
  try {
    const u = new URL(link);
    return btoa(u.origin + u.pathname + u.search).replace(/=+$/g, "");
  } catch {
    return btoa(link).replace(/=+$/g, "");
  }
}
function hashKey(s) {
  // simple non-crypto hash for KV key
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}
