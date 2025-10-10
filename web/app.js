// Dev mode: reuse your existing modules directly.
// These relative imports work when served from project root.
import { loadResources } from "../src/modules/settings.js";
import { startLoop } from "../src/modules/textRotation.js";
import { enableOverlayFeatures } from "../src/modules/overlay.js";

// Register PWA service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(console.error);
}

(async function init() {
  const floater = document.getElementById("floater");
  // Web keeps clicks available. Desktop sets ignore-cursor via Tauri only.
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
