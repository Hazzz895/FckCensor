import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { deliverAddon, formatDeliveryResult } from './addon-delivery.mjs'
import { createModuleBuilder } from './module-build.mjs'

const scriptRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rootDir = process.argv[2] ? path.resolve(process.argv[2]) : scriptRoot
const { default: addonConfig } = await import(pathToFileURL(path.join(rootDir, 'addon.config.mjs')).href)
const sourceDir = path.join(rootDir, 'dist', addonConfig.directoryName)

async function main() {
    const modules = createModuleBuilder(rootDir)
    const stop = () => {
        modules.stop()
        process.exitCode = 130
    }
    process.once('SIGINT', stop)
    process.once('SIGTERM', stop)
    try {
        await modules.update({ force: true, strict: true })
    } finally {
        process.removeListener('SIGINT', stop)
        process.removeListener('SIGTERM', stop)
    }
    if (!modules.ready) return
    const result = await deliverAddon(sourceDir, addonConfig, rootDir)
    console.log(formatDeliveryResult(result))
    console.log(`Addon directory: ${result.targetDir}`)
}

main().catch(error => {
    console.error('Failed to sync addon:', error)
    process.exitCode = 1
})
