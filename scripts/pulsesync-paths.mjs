import path from 'node:path'
import os from 'node:os'

import addonConfig from '../addon.config.mjs'

function getDefaultAppDataDir() {
    if (process.platform === 'win32') {
        return process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
    }

    if (process.platform === 'darwin') {
        return path.join(os.homedir(), 'Library', 'Application Support')
    }

    return process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config')
}

export function getDefaultPulseSyncAddonsDir() {
    return path.join(getDefaultAppDataDir(), 'PulseSync', 'addons')
}

export function getPulseSyncAddonsDir() {
    return process.env.PULSESYNC_ADDONS_DIR || getDefaultPulseSyncAddonsDir()
}

export function getPulseSyncAddonDir() {
    return path.join(getPulseSyncAddonsDir(), addonConfig.directoryName)
}
