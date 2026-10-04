import type { AddonSettingValue, AddonSettings, AddonSettingsStore } from '@pulsesync/yamusic-types'
import addonConfig from '../../addon.config.mjs'
import { AddonSettingValueT, FckCensorAddonSettingKey, FckCensorAddonSettings } from '@/types'
import { debug } from './logger'

function unwrapSetting<T>(entry: AddonSettingValueT<T>, fallback: T): T {
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        const record = entry as AddonSettingValue<T>

        if (typeof record.value !== 'undefined') {
            return record.value
        }

        if (typeof record.default !== 'undefined') {
            return record.default
        }
    }

    return typeof entry !== 'undefined' ? (entry as T) : fallback
}

export function getAddonSettings(): AddonSettingsStore<FckCensorAddonSettings> {
    const settingsStore = window.pulsesyncApi?.getSettings<FckCensorAddonSettings>(addonConfig.id)
    if (!settingsStore) {
        throw new Error('Failed to get addon settings')
    }
    return settingsStore
}

let settings: FckCensorAddonSettings | null = null

export function prepareSettings() {
    if (settings) {
        return
    }
    const settingsStore = getAddonSettings()

    settingsStore.onChange(applySettings)
}

export function readBooleanSetting(key: FckCensorAddonSettingKey, fallback: boolean = false): boolean {
    if (!settings) {
        return fallback
    }
    const result = unwrapSetting(settings[key], fallback);
    return typeof result == "boolean" ? result :
           typeof result == "string" ? result === "true" :
           typeof result == "number" ? result === 1 :
           fallback
}

export function readStringSetting(key: FckCensorAddonSettingKey, fallback: string = ''): string {
    if (!settings) {
        return fallback
    }
    return String(unwrapSetting(settings[key], fallback))
}

export function readNumberSetting(key: FckCensorAddonSettingKey, fallback: number = 0): number {
    if (!settings) {
        return fallback
    }
    const result = Number(unwrapSetting(settings[key], fallback))
    return isNaN(result) ? fallback : result
}

export function isLiteMode() {
    return readBooleanSetting('lite_mode', false)
}

type SettingsCallback<T = boolean | number | string | FckCensorAddonSettings> = (value: T) => void
let settingsCallbacks: [callback: SettingsCallback, key?: FckCensorAddonSettingKey][] = []

export function listenSettings<T>(listener: SettingsCallback<T>, key?: FckCensorAddonSettingKey) {
    settingsCallbacks.push([listener as SettingsCallback, key])
    return listener
}

function applySettings(newSettings: FckCensorAddonSettings) {
    debug("Applying new settings", newSettings)
    const previousSettings = settings
    settings = newSettings

    for (const listener of settingsCallbacks) {
        const [callback, key] = listener

        if (key) {
            const newValue = unwrapSetting(newSettings[key], null)
            if ((previousSettings === null || unwrapSetting(previousSettings[key], null) !== newValue) && newValue !== null) {
                callback(newValue)
            }
        } else if (!key) {
            callback(newSettings)
        }
    }
}

export async function getAssetText(assetName: string) {
    return (await fetch(`http://localhost:2007/assets/${assetName}?name=${addonConfig.id}`)).text()
}
