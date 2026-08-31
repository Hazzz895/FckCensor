import path from 'node:path'
import { promises as fs } from 'node:fs'
import { fileURLToPath } from 'node:url'

import addonConfig from '../addon.config.mjs'
import { getPulseSyncAddonDir, getPulseSyncAddonsDir } from './pulsesync-paths.mjs'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceDir = path.join(rootDir, 'dist', addonConfig.directoryName)

async function main() {
    const targetRoot = getPulseSyncAddonsDir()
    const targetDir = getPulseSyncAddonDir()

    await fs.access(sourceDir)
    await fs.mkdir(targetRoot, { recursive: true })
    await fs.rm(targetDir, { recursive: true, force: true })
    await fs.cp(sourceDir, targetDir, { recursive: true, force: true })

    console.log(`Synced addon to ${targetDir}`)
}

main().catch(error => {
    console.error('Failed to sync addon:', error)
    process.exitCode = 1
})
