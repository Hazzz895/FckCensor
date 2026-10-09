import type { AddonApi, PulseSyncMetadataOverrides } from '@pulsesync/addon-sdk'
import type { SpoofableType } from '@/types'
import { sources } from '@/api/main-api'
import { settings } from '@/settings'
import { cloneEntity } from '@/utils/common'
import { emptyMetadata, metadataPatch, metadataChanges } from './metadata'
const observed: Record<SpoofableType, Set<string>> = { track: new Set(), album: new Set(), artist: new Set() }
const baselines: Record<SpoofableType, Map<string, any>> = { track: new Map(), album: new Map(), artist: new Map() }
let metadataJson = ''
export function resetMetadataState() {
    metadataJson = ''
    for (const entries of Object.values(observed)) entries.clear()
    for (const entries of Object.values(baselines)) entries.clear()
}
function remember(type: SpoofableType, value: any) {
    if (!value || value.id === undefined) return
    const id = String(value.id).split(':')[0],
        entries = observed[type]
    // Register live patches only after seeing the original DTO. Resource hooks run
    // after SDK metadata, so registering unseen IDs would lose the editor's baseline.
    if (!baselines[type].has(id) && (value.title !== undefined || value.name !== undefined)) {
        const keys = [
            'id',
            'title',
            'name',
            'version',
            'coverUri',
            'ogImage',
            'cover',
            'artists',
            'albums',
            'available',
            'error',
            'genre',
            'year',
            'releaseDate',
            'type',
            'durationMs',
            'description',
            'genres',
        ]
        const original = Object.fromEntries(keys.filter(key => key in value).map(key => [key, cloneEntity(value[key])]))
        if (Array.isArray(value.volumes)) original.volumes = value.volumes.map((volume: any[]) => volume.map(track => ({ id: track.id ?? track })))
        baselines[type].set(id, original)
    }
    entries.delete(id)
    entries.add(id)
    while (entries.size > 1000) {
        const oldest = entries.values().next().value!
        entries.delete(oldest)
        baselines[type].delete(oldest)
    }
}
export function rememberResponse(value: any, type?: SpoofableType, depth = 0): void {
    if (!value || typeof value !== 'object' || depth > 8) return
    if (Array.isArray(value)) {
        value.slice(0, 1000).forEach(item => rememberResponse(item, type, depth + 1))
        return
    }
    if (type) remember(type, value)
    else if (value.id !== undefined) {
        if ('durationMs' in value || 'albums' in value) remember('track', value)
        else if ('title' in value) remember('album', value)
        else if ('name' in value) remember('artist', value)
    }
    for (const [key, kind] of [
        ['tracks', 'track'],
        ['track', 'track'],
        ['albums', 'album'],
        ['album', 'album'],
        ['artists', 'artist'],
        ['artist', 'artist'],
        ['popularTracks', 'track'],
        ['lastReleases', 'album'],
    ] as const)
        if (value[key]) rememberResponse(value[key], kind, depth + 1)
    for (const key of [
        'data',
        'items',
        'results',
        'bestResults',
        'release',
        'wave',
        'collection',
        'chart',
        'sequence',
        'similarTracks',
        'similarArtists',
        'best_result_track',
        'best_result_album',
        'best_result_artist',
    ])
        if (value[key]) rememberResponse(value[key], undefined, depth + 1)
}
export function known(type: SpoofableType): string[] {
    const ids = new Set<string>()
    for (const id of [...observed[type]].reverse()) ids.add(id)
    for (const source of sources.getSourcesCollection().sources) for (const id of source.getKnownIds?.(type) ?? []) ids.add(String(id))
    return [...ids]
}
export async function syncMetadata(api: AddonApi, current: () => boolean) {
    const payload: any = emptyMetadata()
    let count = 0,
        bytes = 0
    if (!settings.store.liteMode) {
        const groups = [
            ['track', 'tracks'],
            ['album', 'albums'],
            ['artist', 'artists'],
        ] as const
        const candidates = groups.flatMap(([type, group]) => [...observed[type]].reverse().map(id => ({ type, group, id })))
        for (const { type, group, id } of candidates) {
            if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) continue
            const original = baselines[type].get(id)
            let inherited = {}
            if (original) {
                const copy = cloneEntity(original)
                if (type === 'track') sources.spoofTrack(copy)
                else if (type === 'album') sources.spoofAlbum(copy)
                else sources.spoofArtist(copy)
                inherited = metadataChanges(type, original, copy)
            }
            const patch = { ...inherited, ...metadataPatch(type, sources.getSpoof(type, id)) }
            if (!Object.keys(patch).length) continue
            const size = new TextEncoder().encode(JSON.stringify(patch)).length + id.length
            if (count >= 1000 || bytes + size > 950000) continue
            payload[group][id] = patch
            count++
            bytes += size
        }
    }
    for (const group of ['tracks', 'albums', 'artists'])
        payload[group] = Object.fromEntries(Object.entries(payload[group]).sort(([a], [b]) => a.localeCompare(b)))
    const json = JSON.stringify(payload)
    if (!current() || json === metadataJson) return
    await api.client.setMetadataOverrides(payload as PulseSyncMetadataOverrides)
    if (current()) metadataJson = json
}
