import type { PulseSyncResourceTarget, PulseSyncResourceRequest } from '@pulsesync/addon-sdk'
import { rememberResponse, requestSdkSync } from './bridge'
import { getSdkApi } from './lifecycle'
type ReadTarget = Extract<PulseSyncResourceTarget, { resource: 'tracks' | 'albums' | 'artists' | 'search' }>
type Reads = {
    read: (target: ReadTarget, request: PulseSyncResourceRequest) => Promise<unknown>
    getLyrics: (trackId: string, format?: 'LRC' | 'TEXT') => Promise<string | null>
}
export function getResourceReads(): Reads {
    const resources = getSdkApi()?.resources as (Reads & object) | undefined
    if (typeof resources?.read !== 'function' || typeof resources?.getLyrics !== 'function')
        throw new Error('FckCensor requires WebHost with resource-read-v1. Update the mod and restart Yandex Music.')
    return resources
}
export async function readResource<T>(target: ReadTarget, request: PulseSyncResourceRequest): Promise<T> {
    const api = getSdkApi()
    if (!api) throw new Error('Addon stopped')
    api.signal.throwIfAborted()
    const result = await getResourceReads().read(target, request)
    api.signal.throwIfAborted()
    if (getSdkApi() !== api) throw new Error('Addon stopped')
    rememberResponse(result)
    requestSdkSync(false)
    return result as T
}
