// modules/textRotation.js
export let sentences = [];
export let deck = [];
export let config = { interval: "medium", placement: "bottom-right" };

// Utility: shuffle
export function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Next fact (no repeats until deck empty)
export function nextFact() {
  if (deck.length === 0) deck = shuffle([...sentences]);
  return deck.pop();
}

// Show fact on floater
export function showFact(floater) {
  if (!floater) return;

  if (sentences.length === 0) {
    sentences = ["Debug: fallback fact"];
    deck = shuffle([...sentences]);
  }

  const fact = nextFact();
  floater.textContent = fact;
  floater.className = "";
  floater.classList.add(config.placement, "visible");

  const wordCount = fact.split(" ").length;
  const duration = wordCount < 10 ? 5000 : 7000;

  let hideTimeout = setTimeout(() => {
    floater.classList.remove("visible");
  }, duration);

  floater.onmouseenter = () => clearTimeout(hideTimeout);
  floater.onmouseleave = () => {
    hideTimeout = setTimeout(() => {
      floater.classList.remove("visible");
    }, 2000);
  };
}

// Interval logic
export function getInterval() {
  switch (config.interval) {
    case "low": return Math.floor(Math.random() * (600000 - 360000 + 1)) + 360000;
    case "high": return Math.floor(Math.random() * (120000 - 60000 + 1)) + 60000;
    default: return Math.floor(Math.random() * (360000 - 120000 + 1)) + 120000;
  }
}

export function startLoop(floater) {
  const interval = getInterval();
  setTimeout(() => {
    showFact(floater);
    startLoop(floater);
  }, interval);
}
