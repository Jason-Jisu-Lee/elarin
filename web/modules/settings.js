// web/modules/settings.js
import { sentences, deck, shuffle } from "./textRotation.js";

export async function loadResources() {
  try {
    // Single path for web and Tauri: hit the Pages Function
    const res = await fetch(`/api/sentences?bust=${Date.now()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    if (!res.ok) throw new Error(`API ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("Atlas JSON not an array");

    sentences.splice(0, sentences.length, ...data);
    deck.splice(0, deck.length, ...shuffle([...sentences]));
    return true;
  } catch (e) {
    console.error("loadResources error:", e);
    const floater = document.getElementById("floater");
    if (floater)
      floater.textContent = "Error! Cannot Connect To The Atlas. Please Contact The Developer.";
    return false;
  }
}
