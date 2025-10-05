// src/modules/settings.js
import { sentences, deck, config, shuffle } from "./textRotation.js";

const CFG_INTERVAL_KEY = "config.interval";
const CFG_PLACEMENT_KEY = "config.placement";

async function fetchJSON(path) {
  try {
    const r = await fetch(path, { cache: "no-cache" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    console.warn(`fetch failed: ${path} -> ${e.message}`);
    return null;
  }
}

async function loadJsonWithFallbacks(name) {
  // Try multiple URL patterns to cover asset hosting differences
  const candidates = [
    `./${name}`,
    `${name}`,
    `/` + name,
    `tauri://localhost/${name}`
  ];
  for (const p of candidates) {
    const data = await fetchJSON(p);
    if (data) return data;
  }
  return null;
}

export async function loadResources() {
  try {
    const [sentData, cfgData] = await Promise.all([
      loadJsonWithFallbacks("sentences.json"),
      loadJsonWithFallbacks("config.json")
    ]);

    // Sentences
    if (Array.isArray(sentData) && sentData.length > 0) {
      sentences.splice(0, sentences.length, ...sentData);
      console.log(`✅ Loaded ${sentData.length} sentences`);
    } else {
      console.warn("⚠️ sentences.json missing/invalid, using fallback");
      sentences.splice(0, sentences.length,
        "Bananas are berries, but strawberries are not."
      );
    }

    // Config
    if (cfgData && typeof cfgData === "object") {
      Object.assign(config, cfgData);
      console.log("✅ Config loaded:", config);
    } else {
      console.warn("⚠️ config.json missing/invalid, using defaults");
    }

    // Merge persisted prefs
    const savedInterval = localStorage.getItem(CFG_INTERVAL_KEY);
    const savedPlacement = localStorage.getItem(CFG_PLACEMENT_KEY);
    if (savedInterval) config.interval = savedInterval;
    if (savedPlacement) config.placement = savedPlacement;

    // Prep deck
    deck.splice(0, deck.length, ...shuffle([...sentences]));
    return true;
  } catch (e) {
    console.error("❌ loadResources error:", e);
    return false;
  }
}

export async function saveConfig(newConfig) {
  if (!newConfig) return;
  Object.assign(config, newConfig);
  try {
    if (newConfig.interval) localStorage.setItem(CFG_INTERVAL_KEY, newConfig.interval);
    if (newConfig.placement) localStorage.setItem(CFG_PLACEMENT_KEY, newConfig.placement);
  } catch {}
}
