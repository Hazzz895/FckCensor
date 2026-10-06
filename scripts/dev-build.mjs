import path from 'node:path'
import { spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { deliverAddon, formatDeliveryResult, notifyClient, readLocalModules } from './addon-delivery.mjs'
import { createModuleBuilder } from './module-build.mjs'

const scriptRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rootDir = process.argv[2] ? path.resolve(process.argv[2]) : scriptRoot
const configPath = path.join(rootDir, 'addon.config.mjs')
const buildRoot = path.join(rootDir, '.pulsesync-dev')
const viteBin = path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js')
const ignored = new Set(['node_modules', '.git', '.pulsesync-dev', 'dist', 'target'])
const modules = createModuleBuilder(rootDir)
let child
let stopping = false
let busy = false
let attempted = ''
let lastDelivery
let lastClientCheck = 0
let lastMessage = ''
let retryAfter = 0

async function sourceSignature() {
    const outputs = new Set(Object.values((await readLocalModules(rootDir)) ?? {}).map(ref => path.resolve(rootDir, ref.path)))
    const hash = createHash('sha256')
    async function visit(directory) {
        const entries = await fs.readdir(directory, { withFileTypes: true })
        entries.sort((a, b) => a.name.localeCompare(b.name))
        for (const entry of entries) {
            const file = path.join(directory, entry.name)
            if (entry.isDirectory()) {
                if (!ignored.has(entry.name)) await visit(file)
            } else if (entry.isFile() && !outputs.has(file) && !entry.name.endsWith('.tsbuildinfo') && !entry.name.endsWith('.log')) {
                hash.update(path.relative(rootDir, file))
                hash.update(await fs.readFile(file))
            }
        }
    }
    await visit(rootDir)
    return hash.digest('hex')
}

function report(result) {
    const message = formatDeliveryResult(result)
    if (message !== lastMessage) console.log(message)
    lastMessage = message
}

async function tick() {
    if (busy || stopping || Date.now() < retryAfter) return
    busy = true
    let delivering = false
    try {
        const signature = await sourceSignature()
        if (signature === attempted) {
            if (lastDelivery && Date.now() - lastClientCheck >= 5000) {
                lastClientCheck = Date.now()
                report({ ...lastDelivery, client: await notifyClient(lastDelivery.directoryName) })
            }
            return
        }
        attempted = signature
        const configUrl = new URL(pathToFileURL(configPath).href)
        configUrl.searchParams.set('revision', signature)
        const { default: config } = await import(configUrl.href)
        const directoryName = String(config.directoryName ?? '')
        if (lastDelivery && directoryName !== lastDelivery.directoryName)
            throw new Error('directoryName changed. Stop dev and move or remove the previous addon installation before restarting.')
        if (!directoryName || directoryName === '.' || directoryName === '..' || /[\\/:]/.test(directoryName))
            throw new Error('Invalid addon directoryName')
        const outDir = path.resolve(buildRoot, directoryName)
        if (path.dirname(outDir) !== path.resolve(buildRoot)) throw new Error('Addon output must stay inside .pulsesync-dev')
        await modules.update({ force: true, strict: true })
        if (stopping || !modules.ready) return
        await new Promise((resolve, reject) => {
            child = spawn(process.execPath, [viteBin, 'build', '--mode', 'development'], {
                cwd: rootDir,
                env: { ...process.env, PULSESYNC_ADDON_OUT_DIR: outDir },
                stdio: 'inherit',
                windowsHide: true,
            })
            child.once('error', reject)
            child.once('exit', code => {
                child = undefined
                code === 0 ? resolve() : reject(new Error(`Vite build failed (${code})`))
            })
        })
        if (stopping || !modules.ready || (await sourceSignature()) !== signature) return
        delivering = true
        lastDelivery = await deliverAddon(outDir, config, rootDir)
        lastClientCheck = Date.now()
        report(lastDelivery)
    } catch (error) {
        if (delivering) attempted = ''
        retryAfter = Date.now() + 2000
        if (!stopping) console.error(`Не удалось обновить аддон: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
        busy = false
    }
}

console.log('Разработка аддона: успешные сборки автоматически доставляются в клиент. Ctrl+C — выход.')
const timer = setInterval(() => void tick(), 500)
function stop() {
    stopping = true
    clearInterval(timer)
    modules.stop()
    child?.kill()
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
await tick()
