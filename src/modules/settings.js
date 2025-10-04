// modules/settings.js
import { sentences, deck, config, shuffle } from "./textRotation.js";

export async function loadResources() {
  try {
    const [sentResp, configResp] = await Promise.allSettled([
      fetch("sentences.json"),
      fetch("config.json")
    ]);

    if (sentResp.status === "fulfilled" && sentResp.value.ok) {
      const data = await sentResp.value.json();
      sentences.splice(0, sentences.length, ...data);
    }

    if (configResp.status === "fulfilled" && configResp.value.ok) {
      const cfg = await configResp.value.json();
      Object.assign(config, cfg);
    }

    deck.splice(0, deck.length, ...shuffle([...sentences]));
    return true;
  } catch (err) {
    console.error("Failed to load resources:", err);
    return false;
  }
}
