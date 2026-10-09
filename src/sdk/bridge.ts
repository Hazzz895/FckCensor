import type { AddonApi } from '@pulsesync/addon-sdk'
import { sources } from '@/api/main-api'
import { httpsify } from '@/utils/common'
import { bindSdkApi, onSourcesChanged } from './lifecycle'
import { known, rememberResponse, syncMetadata, resetMetadataState } from './metadata-sync'
import { syncLibrary, resetLibraryState } from './library'
export { rememberResponse } from './metadata-sync'
export { isSdkLibraryArtist, isSdkLibraryAlbum } from './library'
let pending = false,
    full = false,
    running: Promise<void> | undefined,
    revision = 0
let activeApi: AddonApi | undefined
let audioJson = ''
async function syncAudio(api: AddonApi, generation: number) {
    const replacements: Record<string, string> = {}
    let count = 0
    // Resolve local Blobs once; SDK owns registration, LocalSource owns URL lifetime.
    for (const id of known('track')) {
        if (api.signal.aborted || revision !== generation || activeApi !== api) return
        if (!sources.hasPlayerReplacement(id)) continue
        const replacement = await sources.buildPlayerReplacement(id)
        if (replacement?.url) {
            replacements[id] = replacement.url.startsWith('blob:') ? replacement.url : httpsify(replacement.url)
            count++
        }
        if (count >= 10000) break
    }
    const json = JSON.stringify(replacements)
    if (revision === generation && activeApi === api && !api.signal.aborted && json !== audioJson) {
        await api.client.setTrackReplacements(replacements)
        if (activeApi === api) audioJson = json
    }
}
export function requestSdkSync(all = true): void {
    if (!activeApi) return
    pending = true
    full ||= all
    if (all) revision++
    queueMicrotask(() => void flushSdk().catch(error => activeApi?.logger.error('SDK synchronization failed', error)))
}
export async function flushSdk(): Promise<void> {
    if (running) return running
    running = (async () => {
        while (pending && activeApi && !activeApi.signal.aborted) {
            pending = false
            const api = activeApi,
                updateAll = full,
                generation = revision
            full = false
            await syncMetadata(api, () => activeApi === api && !api.signal.aborted)
            if (updateAll) {
                await syncAudio(api, generation)
                await syncLibrary(api, () => activeApi === api && !api.signal.aborted && revision === generation)
            }
        }
    })()
    try {
        await running
    } finally {
        running = undefined
        if (pending && activeApi && !activeApi.signal.aborted)
            queueMicrotask(() => void flushSdk().catch(error => activeApi?.logger.error('SDK synchronization failed', error)))
    }
}
export async function startSdkBridge(api: AddonApi) {
    if (
        typeof api.resources?.registerHook !== 'function' ||
        typeof (api.resources as unknown as { read?: unknown }).read !== 'function' ||
        typeof api.client.setMetadataOverrides !== 'function' ||
        typeof api.client.setLibraryOverrides !== 'function' ||
        typeof api.client.setTrackReplacements !== 'function'
    )
        throw Error('FckCensor requires WebHost with resource-read-v1, metadata and library APIs. Update the mod and restart Yandex Music.')
    activeApi = api
    audioJson = ''
    resetMetadataState()
    resetLibraryState()
    const unbind = bindSdkApi(api),
        changed = onSourcesChanged(() => requestSdkSync())
    const watch = (track: unknown) => {
        if (activeApi !== api) return
        rememberResponse(track, 'track')
        requestSdkSync(false)
    }
    const unsubscribe = api.player.onTrackChange(watch)
    const watchPage = (page: any) => {
        if (activeApi !== api) return
        rememberResponse(page?.entity, page?.type === 'playlist' ? undefined : page?.type)
        requestSdkSync(false)
    }
    const unpage = api.page.onChange(watchPage)
    void Promise.all([api.player.getSnapshot().then(snapshot => watch(snapshot.track)), api.page.getSnapshot().then(watchPage)]).catch(error => {
        if (activeApi === api) api.logger.warn('Initial SDK snapshot unavailable', error)
    })
    return () => {
        if (activeApi !== api) return
        activeApi = undefined
        audioJson = ''
        resetMetadataState()
        resetLibraryState()
        pending = false
        full = false
        revision++
        changed()
        unsubscribe()
        unpage()
        unbind()
        void Promise.allSettled([api.client.clearMetadataOverrides(), api.client.clearLibraryOverrides(), api.client.clearTrackReplacements()])
    }
}
