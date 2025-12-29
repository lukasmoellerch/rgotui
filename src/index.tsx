#!/usr/bin/env bun
import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { App } from "./app.js"

async function main() {
  const renderer = await createCliRenderer()
  createRoot(renderer).render(<App />)
}

main()
