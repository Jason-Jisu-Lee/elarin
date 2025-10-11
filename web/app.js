// Web entry — no bundler required
import { loadResources } from "./modules/settings.js";
import { startLoop, sentences } from "./modules/textRotation.js";
import { enableOverlayFeatures } from "./modules/overlay.js";

(async function init() {
  const floater = document.getElementById("floater");
  if (!floater) return;

  // minimal UI hooks
  enableOverlayFeatures(floater);

  try {
    const ok = await loadResources();
    if (!ok) {
      floater.textContent = "Error: Cannot Connect To The Atlas. Please Contact The Developer.";
      floater.classList.add("visible");
      return;
    }

    if (!Array.isArray(sentences) || sentences.length === 0) {
      floater.textContent = "No sentences loaded.";
      floater.classList.add("visible");
      return;
    }

    startLoop(floater);
  } catch (err) {
    console.error("init error:", err);
    floater.textContent = "Error: Cannot Connect To The Atlas. Please Contact The Developer.";
    floater.classList.add("visible");
  }
})();
