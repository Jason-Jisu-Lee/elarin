let sentences = [];
let deck = [];
let config = { interval: "medium", placement: "bottom-right" }; // defaults
const floater = document.getElementById("floater");

// Utility: shuffle array
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Next fact (no repeats until deck is empty)
function nextFact() {
  if (deck.length === 0) {
    deck = shuffle([...sentences]);
    console.log("♻️ Deck reshuffled");
  }
  return deck.pop();
}

// Show a fact
function showFact() {
  if (sentences.length === 0) {
    console.warn("⚠️ No sentences loaded, using fallback.");
    sentences = ["Debug: fallback fact is working!"];
    deck = shuffle([...sentences]);
  }

  const fact = nextFact();
  console.log("📝 Showing fact:", fact);

  floater.textContent = fact;

  // Apply placement + visibility
  floater.className = "";
  floater.classList.add(config.placement, "visible");

  const wordCount = fact.split(" ").length;
  const duration = wordCount < 10 ? 5000 : 7000;

  let hideTimeout = setTimeout(() => {
    floater.classList.remove("visible");
    console.log("❌ Fact hidden");
  }, duration);

  floater.onmouseenter = () => {
    clearTimeout(hideTimeout);
    console.log("⏸ Hover: paused");
  };

  floater.onmouseleave = () => {
    hideTimeout = setTimeout(() => {
      floater.classList.remove("visible");
      console.log("❌ Fact hidden after hover");
    }, 2000);
  };
}

// Interval logic based on config
function getInterval() {
  switch (config.interval) {
    case "low": return Math.floor(Math.random() * (600000 - 360000 + 1)) + 360000; // 6–10 min
    case "high": return Math.floor(Math.random() * (120000 - 60000 + 1)) + 60000;   // 1–2 min
    case "medium":
    default: return Math.floor(Math.random() * (360000 - 120000 + 1)) + 120000;     // 2–6 min
  }
}

// Loop
function startLoop() {
  const interval = getInterval();
  console.log("⏳ Next fact in", interval / 1000, "seconds");

  setTimeout(() => {
    showFact();
    startLoop();
  }, interval);
}

// Init
async function init() {
  try {
    // Try to load sentences + config
    const [sentResp, configResp] = await Promise.allSettled([
      fetch("sentences.json"),
      fetch("config.json")
    ]);

    if (sentResp.status === "fulfilled" && sentResp.value.ok) {
      sentences = await sentResp.value.json();
    } else {
      console.warn("⚠️ sentences.json not found, using fallback.");
      sentences = ["Bananas are berries, but strawberries are not."];
    }

    if (configResp.status === "fulfilled" && configResp.value.ok) {
      config = await configResp.value.json();
    } else {
      console.warn("⚠️ config.json not found, using defaults.");
    }

    deck = shuffle([...sentences]);
    console.log("✅ Loaded", sentences.length, "facts");
    console.log("✅ Config:", config);

    // Show first fact after 3s
    setTimeout(() => {
      showFact();
      startLoop();
    }, 3000);

  } catch (err) {
    console.error("❌ Init failed:", err);
    sentences = ["Critical error: fallback fact"];
    deck = shuffle([...sentences]);
    showFact();
  }
}

init();
