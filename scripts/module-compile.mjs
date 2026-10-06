import path from 'node:path'
import { spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'
import { createRequire } from 'node:module'
import { createInterface } from 'node:readline'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { discoverModules } from './module-discovery.mjs'

const scriptRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rootDir = process.argv[2] ? path.resolve(process.argv[2]) : scriptRoot
const requireFromProject = createRequire(path.join(rootDir, 'package.json'))

async function buildRust(module) {
    const artifacts = []
    const cargo = spawn(
        'cargo',
        [
            'build',
            '--manifest-path',
            module.entry,
            '--lib',
            '--target',
            'wasm32-unknown-unknown',
            '--release',
            '--message-format=json-render-diagnostics',
        ],
        {
            cwd: rootDir,
            env: {
                ...process.env,
                CARGO_TARGET_DIR: path.join(rootDir, 'dist', 'rust-target', module.alias),
                RUSTFLAGS: [process.env.RUSTFLAGS, '-C link-arg=--max-memory=16777216'].filter(Boolean).join(' '),
            },
            stdio: ['ignore', 'pipe', 'inherit'],
            windowsHide: true,
        },
    )
    const lines = createInterface({ input: cargo.stdout })
    lines.on('line', line => {
        let message
        try {
            message = JSON.parse(line)
        } catch {
            console.log(line)
            return
        }
        if (message.reason === 'compiler-message' && message.message?.rendered) process.stderr.write(message.message.rendered)
        if (message.reason === 'compiler-artifact' && message.manifest_path && path.resolve(message.manifest_path) === module.entry) {
            artifacts.push(...(message.filenames ?? []).filter(file => file.endsWith('.wasm')))
        }
    })
    await new Promise((resolve, reject) => {
        cargo.once('error', error =>
            reject(
                error.code === 'ENOENT'
                    ? new Error(
                          'Cargo не найден. Установите Rust через rustup, выполните rustup target add wasm32-unknown-unknown и перезапустите терминал.',
                      )
                    : error,
            ),
        )
        cargo.once('close', code => {
            lines.close()
            if (code === 0) resolve()
            else reject(new Error(`Rust-модуль ${module.alias} не собран. Причина указана выше.`))
        })
    })
    if (artifacts.length !== 1) throw new Error(`modules/${module.alias}/Cargo.toml: для WASM укажите [lib] crate-type = ["cdylib"].`)
    const output = path.join(rootDir, module.path)
    await fs.mkdir(path.dirname(output), { recursive: true })
    await fs.copyFile(artifacts[0], output)
}

async function main() {
    const modules = await discoverModules(rootDir)
    let javascriptBuilder
    for (const module of modules) {
        console.log(`[modules] ${module.alias}: ${module.kind === 'wasm' ? 'Rust → WASM' : 'JavaScript'}`)
        if (module.kind === 'wasm') await buildRust(module)
        else {
            if (!javascriptBuilder) {
                const { build } = await import(pathToFileURL(requireFromProject.resolve('vite')).href)
                const sdkPackagePath = requireFromProject.resolve('@pulsesync/addon-sdk/package.json')
                const sdkPackage = JSON.parse(await fs.readFile(sdkPackagePath, 'utf8'))
                const { modulePlugin } = await import(
                    pathToFileURL(path.resolve(path.dirname(sdkPackagePath), sdkPackage.exports['./vite'].import)).href
                )
                javascriptBuilder = { build, modulePlugin }
            }
            await javascriptBuilder.build({
                root: rootDir,
                configFile: false,
                plugins: [javascriptBuilder.modulePlugin({ entry: module.entry, outDir: path.dirname(path.join(rootDir, module.path)) })],
            })
        }
    }
    console.log(modules.length ? `[modules] Собрано: ${modules.length}. Файлы — dist/modules/.` : '[modules] Папка modules/ пуста, собирать нечего.')
}

main().catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
})
