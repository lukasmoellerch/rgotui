import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [
    react({
      // Enable React Fast Refresh for component state preservation
      fastRefresh: true,
    }),
  ],
  // Configure for server-side/Node usage
  build: {
    target: "esnext",
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "@opentui/react",
  },
  optimizeDeps: {
    // Don't pre-bundle these - let vite-node handle them
    exclude: ["@opentui/core", "@opentui/react"],
  },
})
