import path from 'node:path'
import { promises as fs } from 'node:fs'

export async function discoverModules(rootDir) {
    const modulesDir = path.join(rootDir, 'modules')
    let folders
    try {
        folders = await fs.readdir(modulesDir, { withFileTypes: true })
    } catch (error) {
        if (error.code === 'ENOENT') return []
        throw error
    }
    const modules = []
    for (const folder of folders.sort((a, b) => a.name.localeCompare(b.name))) {
        if (!folder.isDirectory() || folder.name.startsWith('.')) continue
        const alias = folder.name
        const directory = path.join(modulesDir, alias)
        const files = await fs.readdir(directory, { withFileTypes: true })
        const entries = files.filter(file => file.isFile() && ['index.ts', 'index.js', 'Cargo.toml'].includes(file.name))
        if (!entries.length) continue
        if (!/^[a-z][a-z0-9_-]{0,63}$/.test(alias))
            throw new Error(`Недопустимое имя папки модуля: ${alias}. Используйте строчные латинские буквы, цифры, _ и -.`)
        if (entries.length !== 1) throw new Error(`modules/${alias}: нужен ровно один вход — index.ts, index.js или Cargo.toml.`)
        const kind = entries[0].name === 'Cargo.toml' ? 'wasm' : 'javascript'
        let apiMajor = 1
        if (files.some(file => file.isFile() && file.name === 'module.json')) {
            const config = JSON.parse(await fs.readFile(path.join(directory, 'module.json'), 'utf8'))
            if (!config || !Number.isSafeInteger(config.apiMajor) || config.apiMajor < 1 || Object.keys(config).some(key => key !== 'apiMajor')) {
                throw new Error(`modules/${alias}/module.json: ожидается { "apiMajor": 1 } с положительным целым номером API.`)
            }
            apiMajor = config.apiMajor
        }
        modules.push({
            alias,
            kind,
            apiMajor,
            entry: path.join(directory, entries[0].name),
            path: `dist/modules/${alias}/module.${kind === 'wasm' ? 'wasm' : 'js'}`,
        })
    }
    if (modules.length > 20) throw new Error('В одном аддоне поддерживается до 20 модулей.')
    return modules
}
