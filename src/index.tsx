import { createCliRenderer, LineNumberRenderable, RGBA, SyntaxStyle } from "@opentui/core"
import { createRoot, useKeyboard } from "@opentui/react"
import { useEffect, useRef, useState } from "react"
import { App } from "./app.js"


async function main() {
  const renderer = await createCliRenderer()
  createRoot(renderer).render(<App />)
}

main()
