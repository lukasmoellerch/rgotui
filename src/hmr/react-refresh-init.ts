// Must be imported before @opentui/react to set up devtools hook

let RefreshRuntime: typeof import('react-refresh/runtime') | null = null

function initializeReactRefresh() {
  if (!RefreshRuntime) return

  RefreshRuntime.injectIntoGlobalHook(globalThis)

  // Set up globals that SWC transform expects
  ;(globalThis as any).$RefreshReg$ = (type: any, id: string) => {
    RefreshRuntime!.register(type, id)
  }
  ;(globalThis as any).$RefreshSig$ = () => {
    return RefreshRuntime!.createSignatureFunctionForTransform()
  }
}

if (process.env.NODE_ENV !== 'production') {
  RefreshRuntime = require('react-refresh/runtime')
  initializeReactRefresh()
}

export { RefreshRuntime }
