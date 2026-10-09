import type { AddonApi } from '@pulsesync/addon-sdk'
let api: AddonApi | undefined
const listeners = new Set<() => void>()
export function getSdkApi() {
    return api
}
export function bindSdkApi(value: AddonApi) {
    api = value
    return () => {
        if (api === value) api = undefined
    }
}
export function onSourcesChanged(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
}
export function sourcesChanged() {
    for (const listener of listeners) listener()
}
