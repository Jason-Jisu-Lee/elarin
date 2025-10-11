import { sentences, deck, shuffle } from "./textRotation.js";

function isTauri() {
  return typeof window !== "undefined" && !!window.__TAURI__;
}

export async function loadResources() {
  try {
    let data;

    if (isTauri()) {
      // Desktop only: use local secret to call GitHub directly.
      const { GITHUB_TOKEN } = await import("../secrets/token.js");
      const ghUrl =
        "https://api.github.com/repos/Jason-Jisu-Lee/elarin-atlas/contents/philosophy/general/set_001.json";

      const res = await fetch(ghUrl, {
        headers: {
          "Accept": "application/vnd.github.v3.raw",
          "Authorization": `token ${GITHUB_TOKEN}`
        }
      });
      if (!res.ok) throw new Error(`GitHub fetch failed (${res.status})`);
      data = await res.json();
    } else {
      // Web/PWA: call your backend proxy. No token on client.
      const res = await fetch("/api/sentences", {
        headers: { "Accept": "application/json" }
      });
      if (!res.ok) throw new Error(`API fetch failed (${res.status})`);
      data = await res.json();
    }

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
