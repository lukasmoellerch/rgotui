import { useState } from "react"

interface InputBoxProps {
  placeholder?: string
  onSubmit?: (value: string) => void
}

export function InputBox({ placeholder = "Type here...", onSubmit }: InputBoxProps) {
  const [value, setValue] = useState("")

  return (
    <box
      width="100%"
      flexDirection="column"
      borderStyle="rounded"
      border
    >
      <input
        placeholder={placeholder}
        value={value}
        minHeight={3}
        focused
        onInput={setValue}
        onSubmit={(val) => {
          onSubmit?.(val)
          setValue("")
        }}
      />
    </box>
  )
}
