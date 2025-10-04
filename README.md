# elarin

A lightweight desktop app that displays floating, ever-changing facts on your screen — quiet, minimal, and designed to fade in and out without distraction.

## Features
- Non-repeating fact rotation  
- Random intervals (2–6 minutes)  
- Hover to pause, no clicks required  
- Fully offline (static word bank)  
- Ultra-light native build powered by Tauri  

## Setup
```bash
npm install
npm run tauri dev
```

## Build
```bash
npm run tauri build
```

## Folder Structure
```
src/         → frontend (HTML, JS, CSS)
src-tauri/   → Tauri config + Rust backend
```

## License
MIT
