import { sentences, deck, config, shuffle } from "./textRotation.js"

const CFG_INTERVAL_KEY = "config.interval"
const CFG_PLACEMENT_KEY = "config.placement"

/**
 * Loads and merges all topic arrays from private GitHub repo `elarin-atlas`.
 * Requires a GitHub Personal Access Token with read:contents.
 * Works in Tauri + Vite; keep token in .env as VITE_GITHUB_TOKEN.
 */
export async function loadResources() {
  try {
    const OWNER = "<your-username>"      // GitHub username
    const REPO = "elarin-atlas"          // data repo name
    const TOKEN = import.meta.env.VITE_GITHUB_TOKEN
    const BASE_URL = `https://api.github.com/repos/${OWNER}/${REPO}/contents`

    // Recursively walk GitHub repo structure and collect all .json URLs
    async function listFiles(path = "") {
      const res = await fetch(`${BASE_URL}/${path}`, {
        headers: { Authorization: `token ${TOKEN}` }
      })
      if (!res.ok) throw new Error(`Failed to list ${path}`)
      const entries = await res.json()
      const files = []
      for (const item of entries) {
        if (item.type === "file" && item.name.endsWith(".json")) {
          files.push(item.path)
        } else if (item.type === "dir") {
          const sub = await listFiles(item.path)
          files.push(...sub)
        }
      }
      return files
    }

    // 1️⃣ List all JSON files recursively
    console.log("🔍 Scanning Elarin Atlas repository...")
    const allFiles = await listFiles()
    console.log(`📚 Found ${allFiles.length} JSON files`)

    // 2️⃣ Fetch each JSON file and merge arrays
    const allSentences = new Set()
    for (const path of allFiles) {
      const url = `${BASE_URL}/${path}`
      const res = await fetch(url, {
        headers: {
          Authorization: `token ${TOKEN}`,
          Accept: "application/vnd.github.v3.raw"
        }
      })
      if (!res.ok) {
        console.warn(`⚠️ Skipped ${path} (${res.status})`)
        continue
      }

      const data = await res.json().catch(() => [])
      for (const line of data) {
        if (typeof line === "string") allSentences.add(line.trim())
      }
    }

    // 3️⃣ Transfer into global array
    sentences.splice(0, sentences.length, ...Array.from(allSentences))
    deck.splice(0, deck.length, ...shuffle([...sentences]))

    console.log(`✅ Loaded ${sentences.length} unique entries total`)

    // 4️⃣ Load user config (same as before)
    const savedInterval = localStorage.getItem(CFG_INTERVAL_KEY)
    const savedPlacement = localStorage.getItem(CFG_PLACEMENT_KEY)
    if (savedInterval) config.interval = savedInterval
    if (savedPlacement) config.placement = savedPlacement

    return true
  } catch (err) {
    console.error("❌ loadResources error:", err)
    return false
  }
}

export async function saveConfig(newConfig) {
  if (!newConfig) return
  Object.assign(config, newConfig)
  try {
    if (newConfig.interval)
      localStorage.setItem(CFG_INTERVAL_KEY, newConfig.interval)
    if (newConfig.placement)
      localStorage.setItem(CFG_PLACEMENT_KEY, newConfig.placement)
  } catch {}
}
