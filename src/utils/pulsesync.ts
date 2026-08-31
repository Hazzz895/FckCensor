import type { AddonSettingValue, AddonSettings, AddonSettingsStore } from '@pulsesync/yamusic-types'
import addonConfig from '../../addon.config.mjs'

function unwrapSetting<T>(entry: AddonSettingValue<T> | unknown, fallback: T): T {
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

export function getAddonSettings(addonName: string): AddonSettingsStore {
    return (
        window.pulsesyncApi?.getSettings(addonName) ?? {
            getCurrent: () => ({}),
            onChange: () => () => {},
        }
    )
}

export function readBooleanSetting(settings: AddonSettings, key: string, fallback: boolean): boolean {
    return Boolean(unwrapSetting(settings[key], fallback))
}

export function readStringSetting(settings: AddonSettings, key: string, fallback: string): string {
    return String(unwrapSetting(settings[key], fallback))
}

export async function getAssetText(assetName: string) {
    return (await fetch(`http://localhost:2007/assets/${assetName}?name=${addonConfig.id}`)).text();
}