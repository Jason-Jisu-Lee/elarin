import { defineConfig } from "vite";
import { tauri } from "@tauri-apps/vite-plugin";

// This file tells Vite how to handle Tauri plugin imports
export default defineConfig({
  plugins: [tauri()],

  // Optional but helps when Tauri needs to read outside /src
  server: {
    fs: {
      allow: [".."]
    }
  }
});
