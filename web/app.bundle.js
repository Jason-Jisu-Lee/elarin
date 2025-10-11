var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/secrets/token.js
var token_exports = {};
__export(token_exports, {
  GITHUB_TOKEN: () => GITHUB_TOKEN
});
var GITHUB_TOKEN;
var init_token = __esm({
  "src/secrets/token.js"() {
    GITHUB_TOKEN = "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";
  }
});

// src/modules/textRotation.js
var sentences = [];
var deck = [];
var FADE_IN_MS = 1e3;
var HOLD_MS = 6e3;
var FADE_OUT_MS = 2e3;
var PAUSE_MS = 5e3;
var CYCLE_MS = FADE_IN_MS + HOLD_MS + FADE_OUT_MS + PAUSE_MS;
var cycleTimer = null;
var fadeTimer = null;
var running = false;
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
function nextFact() {
  if (deck.length === 0) {
    deck = shuffle([...sentences]);
    console.log("\u267B\uFE0F Deck reshuffled");
  }
  return deck.pop();
}
function cycle(floater) {
  if (!running || !floater) return;
  floater.classList.remove("visible");
  void floater.offsetWidth;
  const fact = nextFact() || "\u2026";
  floater.textContent = fact;
  floater.style.transition = `opacity ${FADE_IN_MS}ms ease`;
  floater.classList.add("visible");
  clearTimeout(fadeTimer);
  fadeTimer = setTimeout(() => {
    floater.style.transition = `opacity ${FADE_OUT_MS}ms ease`;
    floater.classList.remove("visible");
  }, FADE_IN_MS + HOLD_MS);
  clearTimeout(cycleTimer);
  cycleTimer = setTimeout(() => cycle(floater), CYCLE_MS);
}
function startLoop(floater) {
  if (running) return;
  running = true;
  cycle(floater);
}

// src/modules/settings.js
function isTauri() {
  return typeof window !== "undefined" && !!window.__TAURI__;
}
async function loadResources() {
  try {
    let data;
    if (isTauri()) {
      const { GITHUB_TOKEN: GITHUB_TOKEN2 } = await Promise.resolve().then(() => (init_token(), token_exports));
      const ghUrl = "https://api.github.com/repos/Jason-Jisu-Lee/elarin-atlas/contents/philosophy/general/set_001.json";
      const res = await fetch(ghUrl, {
        headers: {
          "Accept": "application/vnd.github.v3.raw",
          "Authorization": `token ${GITHUB_TOKEN2}`
        }
      });
      if (!res.ok) throw new Error(`GitHub fetch failed (${res.status})`);
      data = await res.json();
    } else {
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
      floater.textContent = "Error: Cannot Connect To The Atlas. Please Contact The Developer.";
    return false;
  }
}

// src/modules/overlay.js
function enableOverlayFeatures() {
}

// web/app.js
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js", { scope: "/" });
}
(async function init() {
  const floater = document.getElementById("floater");
  enableOverlayFeatures(floater);
  try {
    const ok = await loadResources();
    if (!ok) {
      floater.textContent = "Error: Cannot Connect To The Atlas. Please Contact The Developer.";
      floater.classList.add("visible");
      return;
    }
    startLoop(floater);
  } catch (err) {
    console.error("web init error:", err);
    floater.textContent = "Error: Cannot Connect To The Atlas. Please Contact The Developer.";
    floater.classList.add("visible");
  }
})();
