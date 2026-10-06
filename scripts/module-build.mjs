import path from 'node:path'
import { spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { localModuleSignature, readLocalModules } from './addon-delivery.mjs'

const ignoredDirectories = new Set(['node_modules', 'dist', 'target', '.git', '.pulsesync-dev'])

export function createModuleBuilder(rootDir) {
    let child
    let stopped = false
    let ready = false
    let attemptedSignature
    let observedSignature
    let changedAt = 0
    let checking = false
    let lastError = ''

    async function sourceSignature() {
        const modules = await readLocalModules(rootDir)
        if (!modules) return null
        const outputs = new Set(Object.values(modules).map(ref => path.resolve(rootDir, ref.path)))
        const entries = []
        async function visit(directory) {
            for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
                const file = path.join(directory, entry.name)
                if (entry.isDirectory()) {
                    if (!ignoredDirectories.has(entry.name)) await visit(file)
                } else if (entry.isFile() && !outputs.has(file) && !entry.name.endsWith('.tsbuildinfo') && !entry.name.endsWith('.log')) {
                    const stat = await fs.stat(file)
                    entries.push(`${path.relative(rootDir, file)}:${stat.mtimeMs}:${stat.size}`)
                }
            }
        }
        await visit(rootDir)
        return entries.sort().join('|')
    }

    async function build() {
        console.log('[modules] Сборка локальных модулей…')
        if (stopped) return
        await new Promise((resolve, reject) => {
            child = spawn(process.execPath, [fileURLToPath(new URL('./module-compile.mjs', import.meta.url)), rootDir], {
                cwd: rootDir,
                stdio: 'inherit',
                windowsHide: true,
                detached: process.platform !== 'win32',
            })
            child.once('error', reject)
            child.once('exit', (code, signal) => {
                child = undefined
                if (code === 0) resolve()
                else reject(new Error(`Сборка модулей завершилась с ошибкой (${signal ?? code}). Исправьте её — изменения запустят сборку снова.`))
            })
        })
        await localModuleSignature(rootDir)
        console.log('[modules] Готово.')
    }

    return {
        get ready() {
            return ready && !checking
        },
        async update({ force = false, strict = false } = {}) {
            if (stopped || checking) return
            checking = true
            try {
                const signature = await sourceSignature()
                if (stopped) return
                if (signature === null) {
                    ready = true
                    attemptedSignature = undefined
                    lastError = ''
                    return
                }
                if (!force && signature === attemptedSignature) return
                ready = false
                if (signature !== observedSignature) {
                    observedSignature = signature
                    changedAt = Date.now()
                }
                if (!force && Date.now() - changedAt < 500) return
                attemptedSignature = signature
                await build()
                ready = !stopped && (strict || (await sourceSignature()) === signature)
                lastError = ''
            } catch (error) {
                ready = false
                if (strict) throw error
                const message = error instanceof Error ? error.message : String(error)
                if (message !== lastError) console.error(`[modules] ${message}`)
                lastError = message
            } finally {
                checking = false
            }
        },
        stop() {
            stopped = true
            ready = false
            if (!child?.pid) return
            if (process.platform === 'win32') {
                spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }).on('error', () => child?.kill())
            } else {
                try {
                    process.kill(-child.pid, 'SIGTERM')
                } catch {
                    child.kill()
                }
            }
        },
    }
}
