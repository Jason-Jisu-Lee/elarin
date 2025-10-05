// src/modules/textRotation.js
export let sentences = [];
export let deck = [];
export let config = { interval: "medium", placement: "bottom-right" };

// cycle timing (ms)
const CYCLE_MS = 5000;   // total: 5 s
const FADE_MS  = 1000;   // css fade duration
const HOLD_MS  = CYCLE_MS - 2 * FADE_MS; // 3 s visible

let cycleTimer = null;
let fadeTimer  = null;
let running    = false;

// Fisher–Yates shuffle
export function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function nextFact() {
  if (deck.length === 0) {
    deck = shuffle([...sentences]);
    console.log("♻️ Deck reshuffled");
  }
  return deck.pop();
}

function cycle(floater) {
  if (!running || !floater) return;

  floater.classList.remove("visible");
  // force reflow so CSS transition restarts
  // eslint-disable-next-line no-unused-expressions
  floater.offsetWidth;

  const fact = nextFact() || "…";
  floater.textContent = fact;

  floater.classList.add("visible");

  clearTimeout(fadeTimer);
  fadeTimer = setTimeout(() => {
    floater.classList.remove("visible");
  }, FADE_MS + HOLD_MS); // fade-out at 4 s

  clearTimeout(cycleTimer);
  cycleTimer = setTimeout(() => cycle(floater), CYCLE_MS);
}

export function startLoop(floater) {
  if (running) return;
  running = true;
  cycle(floater);
}

export function stopLoop() {
  running = false;
  clearTimeout(cycleTimer);
  clearTimeout(fadeTimer);
  cycleTimer = null;
  fadeTimer = null;
}
