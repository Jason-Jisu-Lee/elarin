import { loadResources } from "./modules/settings.js";
import { startLoop } from "./modules/textRotation.js";
import { enableOverlayFeatures } from "./modules/overlay.js";

function hasTauri() {
  return !!(window.__TAURI__ && window.__TAURI__.window);
}

async function init() {
  const floater = document.getElementById("floater");

  // Build inner DOM (adds #floater-text + controls)
  enableOverlayFeatures(floater);

  // Load data
  const ok = await loadResources();
  if (!ok) {
    const textEl = document.getElementById("floater-text");
    if (textEl) textEl.textContent = "Failed to load resources.";
    return;
  }

  // Start rotation on the TEXT span, not the container
  const textEl = document.getElementById("floater-text");
  startLoop(textEl);

  // Do NOT enable OS-level click-through here; it breaks hover
  if (hasTauri()) {
    console.log("Running with Tauri. Window remains interactive for hover icons.");
  } else {
    console.log("Running without Tauri window API.");
  }
}

init();
