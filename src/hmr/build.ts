import fs from 'node:fs'
import path from 'node:path'
import type { BunPlugin } from 'bun'
import * as swc from '@swc/core'

// React Refresh transform plugin for hot reloading using SWC (Rust-based, ~20x faster than Babel)
// Transforms extension source files to inject $RefreshReg$ and $RefreshSig$ calls
export const reactRefreshPlugin: BunPlugin = {
  name: 'react-refresh-transform',
  async setup(build) {
    build.onLoad({ filter: /\.[tj]sx?$/ }, async (args) => {
      // Skip node_modules
      if (args.path.includes('node_modules')) {
        return undefined
      }

      // Skip hmr folder itself to avoid transforming the runtime
      if (args.path.includes('/hmr/')) {
        return undefined
      }

      const code = await Bun.file(args.path).text()

      const isTypeScript = args.path.endsWith('.ts') || args.path.endsWith('.tsx')
      const hasJsx = args.path.endsWith('.tsx') || args.path.endsWith('.jsx')

      const result = await swc.transform(code, {
        filename: args.path,
        jsc: {
          parser: isTypeScript
            ? {
                syntax: 'typescript',
                tsx: hasJsx,
              }
            : {
                syntax: 'ecmascript',
                jsx: hasJsx,
              },
          transform: {
            react: {
              development: true,
              refresh: true, // Built-in React Refresh support in SWC
              runtime: 'automatic',
            },
          },
        },
        sourceMaps: 'inline',
      })

      if (!result?.code) {
        return undefined
      }

      return {
        contents: result.code,
        loader: 'js', // SWC transforms JSX to JS
      }
    })
  },
}

export interface BuildResult {
  bundlePath: string
  success: boolean
  error?: string
}

export async function buildWithHotReload({
  entryPoint,
  outDir,
  hotReload = true,
}: {
  entryPoint: string
  outDir: string
  hotReload?: boolean
}): Promise<BuildResult> {
  const resolvedEntry = path.resolve(entryPoint)
  const resolvedOutDir = path.resolve(outDir)

  // Ensure output directory exists
  if (!fs.existsSync(resolvedOutDir)) {
    fs.mkdirSync(resolvedOutDir, { recursive: true })
  }

  const plugins: BunPlugin[] = []
  if (hotReload) {
    plugins.push(reactRefreshPlugin)
  }

  const entryName = path.basename(resolvedEntry, path.extname(resolvedEntry))

  const result = await Bun.build({
    entrypoints: [resolvedEntry],
    outdir: resolvedOutDir,
    target: 'bun',
    format: 'esm',
    plugins,
    naming: `${entryName}.js`,
    throw: false,
    external: ['@opentui/core', '@opentui/react', 'react', 'react-refresh'],
  })

  if (!result.success) {
    const errorMessage = result.logs.map((log: any) => log.message || log).join('\n')
    return {
      bundlePath: '',
      success: false,
      error: errorMessage,
    }
  }

  const bundlePath = path.join(resolvedOutDir, `${entryName}.js`)

  return {
    bundlePath,
    success: true,
  }
}
