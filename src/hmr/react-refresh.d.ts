declare module 'react-refresh/runtime' {
  export function injectIntoGlobalHook(global: typeof globalThis): void
  export function register(type: unknown, id: string): void
  export function createSignatureFunctionForTransform(): (type: unknown) => unknown
  export function performReactRefresh(): void
}
