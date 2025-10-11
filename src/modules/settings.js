import { sentences, deck, shuffle } from "./textRotation.js";

function isTauri() {
  return typeof window !== "undefined" && !!window.__TAURI__;
}

export async function loadResources() {
  try {
    let data;

    if (isTauri()) {
      // Desktop-only path (kept for future). Never runs on web.
      const { GITHUB_TOKEN } = await import("../secrets/token.js");
      const ghUrl =
        "https://api.github.com/repos/Jason-Jisu-Lee/elarin-atlas/contents/philosophy/general/set_001.json";
      const res = await fetch(ghUrl, {
        headers: {
          "Accept": "application/vnd.github.v3.raw",
          "Authorization": `token ${GITHUB_TOKEN}`
        },
        cache: "no-store"
      });
      if (!res.ok) throw new Error(`GitHub fetch failed (${res.status})`);
      data = await res.json();
    } else {
      // Web/PWA: hit edge with a cache-buster and no-store
      const res = await fetch(`/api/sentences?bust=${Date.now()}`, {
        headers: { "Accept": "application/json" },
        cache: "no-store"
      });
      if (!res.ok) throw new Error(`API fetch failed (${res.status})`);
      data = await res.json();
    }

    // Expect an array. Guard against bad JSON formats.
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


