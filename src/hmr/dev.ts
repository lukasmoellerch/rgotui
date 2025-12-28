#!/usr/bin/env bun

// CRITICAL: Import react-refresh-init FIRST before anything that imports @opentui/react
// This ensures the devtools hook exists before the reconciler calls injectIntoDevTools()
import { RefreshRuntime } from './react-refresh-init'

import fs from 'node:fs'
import path from 'node:path'
import React from 'react'
import * as watcher from '@parcel/watcher'
import { createCliRenderer } from '@opentui/core'
import { createRoot } from '@opentui/react'
import { buildWithHotReload } from './build'

const BUNDLE_DIR = '.opentui-bundle'

// Patterns to ignore when watching for file changes
const IGNORED_DIRS = [
  'node_modules',
  '.opentui-bundle',
  '.git',
  '.cache',
  'dist',
  'build',
  'tmp',
  '.tmp',
]

const IGNORED_EXTENSIONS = ['.log', '.db', '.sqlite']

// Glob patterns for @parcel/watcher
const ignoredPatterns = [
  ...IGNORED_DIRS.map((dir) => `**/${dir}/**`),
  ...IGNORED_EXTENSIONS.map((ext) => `**/*${ext}`),
  '**/*.db-*',
  '**/*.sqlite-*',
]

// Backup filter for files that should never trigger rebuild
function shouldIgnoreFile(filePath: string, rootPath: string): boolean {
  const relativePath = path.relative(rootPath, filePath)

  // Ignore files outside the root directory
  if (relativePath.startsWith('..')) {
    return true
  }

  // Check if path contains any ignored directory
  const hasIgnoredDir = IGNORED_DIRS.some(
    (dir) => relativePath.includes(`/${dir}/`) || relativePath.startsWith(`${dir}/`)
  )
  if (hasIgnoredDir) {
    return true
  }

  // Check if file has ignored extension
  if (IGNORED_EXTENSIONS.some((ext) => relativePath.endsWith(ext))) {
    return true
  }

  // Also catch .db-* and .sqlite-* patterns
  if (/\.db-|\.sqlite-/.test(relativePath)) {
    return true
  }

  return false
}

interface DevState {
  rebuildCount: number
  isBuilding: boolean
  bundlePath: string
  rootPath: string
  componentPath: string
  // Store the current App component for initial render
  // React Refresh will update the implementation in-place
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
  if (state.isBuilding) {
    console.log('[HMR] Build already in progress, skipping...')
    return
  }

  state.isBuilding = true
  console.log('[HMR] File changed, rebuilding...')

  try {
    const result = await buildWithHotReload({
      entryPoint: state.componentPath,
      outDir: path.join(state.rootPath, BUNDLE_DIR),
      hotReload: true,
    })

    if (!result.success) {
      console.error('[HMR] Build failed:', result.error)
      state.isBuilding = false
      return
    }

    state.rebuildCount++
    state.bundlePath = result.bundlePath

    // Re-import the module with cache-busting query param
    // This triggers $RefreshReg$ calls which register new component versions
    // IMPORTANT: We do NOT update state.AppComponent - React Refresh handles
    // updating the implementation in-place. Changing the component reference
    // would cause React to unmount/remount, losing state.
    try {
      await import(`${state.bundlePath}?v=${state.rebuildCount}`)
    } catch (err) {
      console.error('[HMR] Failed to reimport module:', err)
      state.isBuilding = false
      return
    }

    // Trigger React Refresh - this updates components in-place!
    // The reconciler will find all fibers using updated "families"
    // and schedule re-renders with the new implementations
    if (RefreshRuntime) {
      RefreshRuntime.performReactRefresh()
      console.log('[HMR] ✓ Hot reload complete')
    } else {
      console.log('[HMR] ✓ Rebuild complete (no React Refresh runtime)')
    }
  } catch (error: any) {
    console.error('[HMR] Rebuild failed:', error.message)
  } finally {
    state.isBuilding = false
  }
}

// Wrapper component that the dev runner manages
// This stays mounted - React Refresh updates the App implementation in-place
function DevWrapper(): React.ReactElement | null {
  // Render the initial component reference
  // React Refresh will update its implementation without changing this reference
  if (!state.AppComponent) {
    return null
  }

  // NO KEY - we want React Refresh to update in-place, not remount
  return React.createElement(state.AppComponent)
}

export async function startDevMode({
  componentPath,
  rootPath = process.cwd(),
}: {
  componentPath: string
  rootPath?: string
}): Promise<void> {
  const resolvedRoot = path.resolve(rootPath)
  const resolvedComponent = path.resolve(componentPath)

  if (!fs.existsSync(resolvedComponent)) {
    throw new Error(`Component file does not exist: ${resolvedComponent}`)
  }

  state.rootPath = resolvedRoot
  state.componentPath = resolvedComponent

  const bundleDir = path.join(resolvedRoot, BUNDLE_DIR)

  // Add .gitignore to bundle dir
  if (!fs.existsSync(bundleDir)) {
    fs.mkdirSync(bundleDir, { recursive: true })
  }
  fs.writeFileSync(path.join(bundleDir, '.gitignore'), '*\n')

  // Initial build
  console.log('[HMR] Building...')
  const result = await buildWithHotReload({
    entryPoint: resolvedComponent,
    outDir: bundleDir,
    hotReload: true,
  })

  if (!result.success) {
    throw new Error(`Initial build failed: ${result.error}`)
  }

  state.bundlePath = result.bundlePath
  state.rebuildCount = 1

  // Import the component module (NOT the entry point with main())
  console.log('[HMR] Loading component...')
  const module = await import(state.bundlePath)
  
  // Get the App component (exported as named export "App" or default)
  const AppComponent = module.App || module.default
  if (!AppComponent) {
    throw new Error('Component file must export "App" or a default component')
  }
  
  state.AppComponent = AppComponent

  // Create renderer and root ONCE - they stay mounted throughout HMR
  console.log('[HMR] Starting app...')
  const renderer = await createCliRenderer({
    onDestroy: () => {
      process.exit(0)
    },
  })
  
  // Render the DevWrapper which will handle component swapping
  createRoot(renderer).render(React.createElement(DevWrapper))

  // Only watch if running in a TTY (interactive terminal)
  if (!process.stdout.isTTY) {
    console.log('[HMR] Not running in interactive terminal, watching disabled')
    return
  }

  console.log('[HMR] Watching for file changes...\n')

  // Watch for file changes
  const subscription = await watcher.subscribe(
    resolvedRoot,
    (err, events) => {
      if (err) {
        console.error('[HMR] Watcher error:', err)
        return
      }

      // Filter out events for files that should be ignored
      const relevantEvents = events.filter(
        (event) => !shouldIgnoreFile(event.path, resolvedRoot)
      )

      if (relevantEvents.length > 0) {
        const changedFile = path.relative(resolvedRoot, relevantEvents[0].path)
        console.log(`[HMR] Changed: ${changedFile}`)
        triggerRebuild()
      }
    },
    { ignore: ignoredPatterns }
  )

  // Clean up watcher on exit signals
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
  const args = process.argv.slice(2)
  // Now expects the component file (e.g., src/App.tsx), not the entry point
  const componentPath = args[0] || 'src/App.tsx'

  startDevMode({
    componentPath,
    rootPath: process.cwd(),
  }).catch((err) => {
    console.error('Failed to start dev mode:', err.message)
    process.exit(1)
  })
}
