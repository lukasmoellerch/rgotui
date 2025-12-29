import fs from 'node:fs'
import path from 'node:path'
import type { BunPlugin } from 'bun'
import * as swc from '@swc/core'

// React Refresh transform plugin using SWC
const reactRefreshPlugin: BunPlugin = {
  name: 'react-refresh-transform',
  async setup(build) {
    build.onLoad({ filter: /\.[tj]sx?$/ }, async (args) => {
      if (args.path.includes('node_modules') || args.path.includes('/hmr/')) {
        return undefined
      }

      const code = await Bun.file(args.path).text()
      const isTypeScript = args.path.endsWith('.ts') || args.path.endsWith('.tsx')
      const hasJsx = args.path.endsWith('.tsx') || args.path.endsWith('.jsx')

      const result = await swc.transform(code, {
        filename: args.path,
        jsc: {
          parser: isTypeScript
            ? { syntax: 'typescript', tsx: hasJsx }
            : { syntax: 'ecmascript', jsx: hasJsx },
          transform: {
            react: {
              development: true,
              refresh: true,
              runtime: 'automatic',
            },
          },
        },
        sourceMaps: 'inline',
      })

      return result?.code ? { contents: result.code, loader: 'js' } : undefined
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
}: {
  entryPoint: string
  outDir: string
}): Promise<BuildResult> {
  const resolvedEntry = path.resolve(entryPoint)
  const resolvedOutDir = path.resolve(outDir)

  fs.mkdirSync(resolvedOutDir, { recursive: true })

  const entryName = path.basename(resolvedEntry, path.extname(resolvedEntry))

  const result = await Bun.build({
    entrypoints: [resolvedEntry],
    outdir: resolvedOutDir,
    target: 'bun',
    format: 'esm',
    plugins: [reactRefreshPlugin],
    naming: `${entryName}.js`,
    throw: false,
    external: ['@opentui/core', '@opentui/react', 'react', 'react-refresh'],
  })

  if (!result.success) {
    return {
      bundlePath: '',
      success: false,
      error: result.logs.map((log: any) => log.message || log).join('\n'),
    }
  }

  return {
    bundlePath: path.join(resolvedOutDir, `${entryName}.js`),
    success: true,
  }
}
