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
  console.log("⏳ loadResources() starting...");
  try {
    // --- Prevent race condition with Tauri asset server ---
    await new Promise((r) => setTimeout(r, 120)); // small delay fixes early-fetch race

    const [sentResp, configResp] = await Promise.allSettled([
      fetch("sentences.json"),
      fetch("config.json")
    ]);

    // ----- Sentences -----
    if (sentResp.status === "fulfilled" && sentResp.value.ok) {
      const data = await sentResp.value.json();
      if (Array.isArray(data) && data.length > 0) {
        sentences.splice(0, sentences.length, ...data);
        console.log(`✅ Loaded ${data.length} sentences`);
      } else {
        console.warn("⚠️ sentences.json empty or invalid, using fallback");
        sentences.splice(0, sentences.length,
          "Bananas are berries, but strawberries are not."
        );
      }
    } else {
      console.warn("⚠️ sentences.json fetch failed, using fallback");
      sentences.splice(0, sentences.length,
        "Bananas are berries, but strawberries are not."
      );
    }

    // ----- Config -----
    if (configResp.status === "fulfilled" && configResp.value.ok) {
      const base = await configResp.value.json();
      Object.assign(config, base || {});
      console.log("✅ Config loaded:", config);
    } else {
      console.warn("⚠️ config.json fetch failed, using defaults");
    }

    // ----- Merge persisted user preferences -----
    const savedInterval = localStorage.getItem(CFG_INTERVAL_KEY);
    const savedPlacement = localStorage.getItem(CFG_PLACEMENT_KEY);
    if (savedInterval) config.interval = savedInterval;
    if (savedPlacement) config.placement = savedPlacement;

    // ----- Prepare shuffled deck -----
    deck.splice(0, deck.length, ...shuffle([...sentences]));
    console.log("♻️ Deck prepared");
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
