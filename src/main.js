import { loadResources } from "./modules/settings.js";
import { showFact, startLoop } from "./modules/textRotation.js";
import { enableOverlayFeatures } from "./modules/overlay.js";

const floater = document.getElementById("floater");

async function init() {
  const loaded = await loadResources();

  if (loaded) {
    enableOverlayFeatures(floater);
    setTimeout(() => {
      showFact(floater);
      startLoop(floater);
    }, 3000);
  } else {
    floater.textContent = "Error loading data.";
  }
}

init();
