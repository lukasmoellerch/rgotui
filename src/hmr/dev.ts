#!/usr/bin/env bun

// Import react-refresh-init FIRST before anything that imports @opentui/react
import { RefreshRuntime } from './react-refresh-init'

import fs from 'node:fs'
import path from 'node:path'
import React from 'react'
import * as watcher from '@parcel/watcher'
import { createCliRenderer } from '@opentui/core'
import { createRoot } from '@opentui/react'
import { buildWithHotReload } from './build'

const BUNDLE_DIR = '.opentui-bundle'

const IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/.opentui-bundle/**',
  '**/.git/**',
  '**/dist/**',
  '**/*.log',
]

interface DevState {
  rebuildCount: number
  isBuilding: boolean
  bundlePath: string
  rootPath: string
  componentPath: string
  AppComponent: React.ComponentType<any> | null
}

const state: DevState = {
  rebuildCount: 0,
  isBuilding: false,
  bundlePath: '',
  rootPath: '',
  componentPath: '',
  AppComponent: null,
}

async function triggerRebuild(): Promise<void> {
  if (state.isBuilding) return

  state.isBuilding = true
  console.log('[HMR] Rebuilding...')

  try {
    const result = await buildWithHotReload({
      entryPoint: state.componentPath,
      outDir: path.join(state.rootPath, BUNDLE_DIR),
    })

    if (!result.success) {
      console.error('[HMR] Build failed:', result.error)
      return
    }

    state.rebuildCount++
    state.bundlePath = result.bundlePath

    // Re-import module with cache-busting to trigger $RefreshReg$ calls
    await import(`${state.bundlePath}?v=${state.rebuildCount}`)

    // Trigger React Refresh to update components in-place
    RefreshRuntime?.performReactRefresh()
    console.log('[HMR] ✓ Hot reload complete')
  } catch (error: any) {
    console.error('[HMR] Rebuild failed:', error.message)
  } finally {
    state.isBuilding = false
  }
}

function DevWrapper(): React.ReactElement | null {
  return state.AppComponent ? React.createElement(state.AppComponent) : null
}

export async function startDevMode({
  componentPath,
  rootPath = process.cwd(),
}: {
  componentPath: string
  rootPath?: string
}): Promise<void> {
  state.rootPath = path.resolve(rootPath)
  state.componentPath = path.resolve(componentPath)

  if (!fs.existsSync(state.componentPath)) {
    throw new Error(`Component file does not exist: ${state.componentPath}`)
  }

  const bundleDir = path.join(state.rootPath, BUNDLE_DIR)
  fs.mkdirSync(bundleDir, { recursive: true })
  fs.writeFileSync(path.join(bundleDir, '.gitignore'), '*\n')

  // Initial build
  console.log('[HMR] Building...')
  const result = await buildWithHotReload({
    entryPoint: state.componentPath,
    outDir: bundleDir,
  })

  if (!result.success) {
    throw new Error(`Initial build failed: ${result.error}`)
  }

  state.bundlePath = result.bundlePath
  state.rebuildCount = 1

  // Import and get the App component
  const module = await import(state.bundlePath)
  state.AppComponent = module.App || module.default

  if (!state.AppComponent) {
    throw new Error('Component file must export "App" or a default component')
  }

  // Create renderer and render
  const renderer = await createCliRenderer({
    onDestroy: () => process.exit(0),
  })
  createRoot(renderer).render(React.createElement(DevWrapper))

  if (!process.stdout.isTTY) {
    console.log('[HMR] Not in interactive terminal, watching disabled')
    return
  }

  console.log('[HMR] Watching for file changes...\n')

  const subscription = await watcher.subscribe(
    state.rootPath,
    (err, events) => {
      if (err) {
        console.error('[HMR] Watcher error:', err)
        return
      }
      if (events.length > 0) {
        const changedFile = path.relative(state.rootPath, events[0].path)
        console.log(`[HMR] Changed: ${changedFile}`)
        triggerRebuild()
      }
    },
    { ignore: IGNORE_PATTERNS }
  )

  const cleanup = async () => {
    console.log('\n[HMR] Shutting down...')
    await subscription.unsubscribe()
    process.exit(0)
  }

  process.on('SIGINT', cleanup)
  process.on('SIGTERM', cleanup)
}

// CLI entry point
if (import.meta.main) {
  const componentPath = process.argv[2] || 'src/App.tsx'

  startDevMode({
    componentPath,
    rootPath: process.cwd(),
  }).catch((err) => {
    console.error('Failed to start dev mode:', err.message)
    process.exit(1)
  })
}
