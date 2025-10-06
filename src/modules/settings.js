import { sentences, deck, config, shuffle } from "./textRotation.js";

const CFG_INTERVAL_KEY = "config.interval";
const CFG_PLACEMENT_KEY = "config.placement";

export async function loadResources() {
  try {
    const [sentResp, configResp] = await Promise.allSettled([
      fetch("sentences.json"),
      fetch("config.json")
    ]);

    // sentences
    if (sentResp.status === "fulfilled" && sentResp.value.ok) {
      const data = await sentResp.value.json();
      sentences.splice(0, sentences.length, ...data);
    } else {
      sentences.splice(0, sentences.length, ..."Bananas are berries, but strawberries are not.".split("\n"));
    }

    // base config
    if (configResp.status === "fulfilled" && configResp.value.ok) {
      const base = await configResp.value.json();
      Object.assign(config, base || {});
    }

    // merge persisted user prefs
    const savedInterval = localStorage.getItem(CFG_INTERVAL_KEY);
    const savedPlacement = localStorage.getItem(CFG_PLACEMENT_KEY);
    if (savedInterval) config.interval = savedInterval;
    if (savedPlacement) config.placement = savedPlacement;

    // prepare deck
    deck.splice(0, deck.length, ...shuffle([...sentences]));
    return true;
  } catch (e) {
    console.error("loadResources error:", e);
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
