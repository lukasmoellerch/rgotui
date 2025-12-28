import { LineNumberRenderable, RGBA, SyntaxStyle } from "@opentui/core"
import { useKeyboard } from "@opentui/react"
import { useEffect, useRef, useState } from "react"
import { InputBox } from "./InputBox"

export function App() {
    const [showLineNumbers, setShowLineNumbers] = useState(true)
    const [showDiffHighlights, setShowDiffHighlights] = useState(false)
    const [showDiagnostics, setShowDiagnostics] = useState(false)
  
    const codeContent = `function fibonacci(n: number): number {
    if (n <= 1) return n
    return fibonacci(n - 1) + fibonacci(n - 2)
  }
  
  const results = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    .map(fibonacci)
  
  console.log('Fibonacci sequence:', results)
  
  // Calculate the sum
  const sum = results.reduce((acc, val) => acc + val, 0)
  console.log('Sum:', sum)
  
  // Find even numbers
  const evens = results.filter(n => n % 2 === 0)
  console.log('Even numbers:', evens)`
  
    const syntaxStyle = SyntaxStyle.fromStyles({
      keyword: { fg: RGBA.fromHex("#C792EA") },
      function: { fg: RGBA.fromHex("#82AAFF") },
      string: { fg: RGBA.fromHex("#C3E88D") },
      number: { fg: RGBA.fromHex("#F78C6C") },
      comment: { fg: RGBA.fromHex("#546E7A") },
      type: { fg: RGBA.fromHex("#FFCB6B") },
      operator: { fg: RGBA.fromHex("#89DDFF") },
      variable: { fg: RGBA.fromHex("#EEFFFF") },
      default: { fg: RGBA.fromHex("#A6ACCD") },
    })
  
    const lineNumberRef = useRef<LineNumberRenderable>(null)
  
    useEffect(() => {
      if (showDiffHighlights) {
        lineNumberRef.current?.setLineColor(1, "#1a4d1a")
        lineNumberRef.current?.setLineSign(1, { after: " +", afterColor: "#22c55e" })
        lineNumberRef.current?.setLineColor(5, "#4d1a1a")
        lineNumberRef.current?.setLineSign(5, { after: " -", afterColor: "#ef4444" })
        lineNumberRef.current?.setLineColor(10, "#1a4d1a")
        lineNumberRef.current?.setLineSign(10, { after: " +", afterColor: "#22c55e" })
      }
  
      if (showDiagnostics) {
        lineNumberRef.current?.setLineSign(0, { before: "⚠️", beforeColor: "#f59e0b" })
        lineNumberRef.current?.setLineSign(7, { before: "💡", beforeColor: "#3b82f6" })
        lineNumberRef.current?.setLineSign(13, { before: "❌", beforeColor: "#ef4444" })
      }
    }, [showDiffHighlights, showDiagnostics])
  
    useKeyboard((key) => {
      if (key.name === "l" && !key.ctrl && !key.meta) {
        toggleLineNumbers()
      } else if (key.name === "h" && !key.ctrl && !key.meta) {
        toggleDiffHighlights()
      } else if (key.name === "d" && !key.ctrl && !key.meta) {
        toggleDiagnostics()
      }
    })
  
    const toggleLineNumbers = () => {
      setShowLineNumbers(!showLineNumbers)
    }
  
    const toggleDiffHighlights = () => {
      const newValue = !showDiffHighlights
      setShowDiffHighlights(newValue)
  
      if (newValue) {
        lineNumberRef.current?.setLineColor(1, "#1a4d1a")
        lineNumberRef.current?.setLineSign(1, { after: " +", afterColor: "#22c55e" })
        lineNumberRef.current?.setLineColor(5, "#4d1a1a")
        lineNumberRef.current?.setLineSign(5, { after: " -", afterColor: "#ef4444" })
        lineNumberRef.current?.setLineColor(10, "#1a4d1a")
        lineNumberRef.current?.setLineSign(10, { after: " +", afterColor: "#22c55e" })
      } else {
        lineNumberRef.current?.clearAllLineColors()
        if (!showDiagnostics) {
          lineNumberRef.current?.clearAllLineSigns()
        } else {
          lineNumberRef.current?.setLineSign(1, {})
          lineNumberRef.current?.setLineSign(5, {})
          lineNumberRef.current?.setLineSign(10, {})
        }
      }
    }
  
    const toggleDiagnostics = () => {
      const newValue = !showDiagnostics
      setShowDiagnostics(newValue)
  
      if (newValue) {
        lineNumberRef.current?.setLineSign(0, { before: "⚠️", beforeColor: "#f59e0b" })
        lineNumberRef.current?.setLineSign(7, { before: "💡", beforeColor: "#3b82f6" })
        lineNumberRef.current?.setLineSign(13, { before: "❌", beforeColor: "#ef4444" })
      } else {
        if (!showDiffHighlights) {
          lineNumberRef.current?.clearAllLineSigns()
        } else {
          lineNumberRef.current?.setLineSign(0, {})
          lineNumberRef.current?.setLineSign(7, {})
          lineNumberRef.current?.setLineSign(13, {})
        }
      }
    }
  
    return (
      <box flexDirection="column" width="100%" height="100%" gap={1}>

        <box>
          <line-number
            ref={lineNumberRef}
            fg="#6b7280"
            bg="#161b22"
            minWidth={3}
            paddingRight={2}
            showLineNumbers={showLineNumbers}
            width="100%"
            height="100%"
          >
            <code
              content={codeContent}
              filetype="typescript"
              syntaxStyle={syntaxStyle}
              selectable
              selectionBg="#264F78"
              selectionFg="#FFFFFF"
              width="100%"
              height="100%"
            />
          </line-number>
        </box>

        <InputBox
          placeholder="Enter a command..."
          onSubmit={(value) => console.log("Submitted:", value)}
        />
      </box>
    )
  }