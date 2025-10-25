export let sentences = [];
export let deck = [];
export let config = { interval: "medium", placement: "bottom-right" };

// timings (ms)
const FADE_IN_MS = 1200; // 1s
const HOLD_MS = 8000; // 6s visible
const FADE_OUT_MS = 4000; // 2s
const PAUSE_MS = 5000; // 5s hidden pause
const CYCLE_MS = FADE_IN_MS + HOLD_MS + FADE_OUT_MS + PAUSE_MS;

let cycleTimer = null;
let fadeTimer = null;
let running = false;

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

  // ensure starting hidden
  floater.classList.remove("visible");
  // force reflow so CSS transition restarts
  void floater.offsetWidth;

  const fact = nextFact() || "…";
  floater.textContent = fact;

  // fade in
  floater.style.transition = `opacity ${FADE_IN_MS}ms ease`;
  floater.classList.add("visible");

  clearTimeout(fadeTimer);
  // schedule fade out after hold
  fadeTimer = setTimeout(() => {
    floater.style.transition = `opacity ${FADE_OUT_MS}ms ease`;
    floater.classList.remove("visible"); // fades out over FADE_OUT_MS
  }, FADE_IN_MS + HOLD_MS);

  clearTimeout(cycleTimer);
  // next cycle after fade-out completes + pause
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
