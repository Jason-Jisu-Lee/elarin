import { sentences, deck, config, shuffle } from "./textRotation.js";
import { GITHUB_TOKEN } from "../secrets/token.js";

export async function loadResources() {
  try {
    const ghUrl =
      "https://api.github.com/repos/Jason-Jisu-Lee/elarin-atlas/contents/philosophy/general/set_001.json";

    const response = await fetch(ghUrl, {
      headers: {
        "Accept": "application/vnd.github.v3.raw",
        "Authorization": `token ${GITHUB_TOKEN}`
      }
    });

    if (!response.ok) {
      throw new Error("Error: Cannot Connect To The Atlas. Please Contact The Developer.");
    }

    const data = await response.json();
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
