import type { PulseSyncMetadataOverrides, PulseSyncLibraryTrack, PulseSyncLibraryAlbum } from '@pulsesync/addon-sdk'
import type { SpoofableType } from '@/types'
import { FALLBACK_ENTITY } from '@/api/dto/fallback'
const fields = {
    track: ['title', 'name', 'version', 'coverUri', 'ogImage', 'available', 'error'],
    album: ['title', 'name', 'version', 'coverUri', 'ogImage', 'genre', 'year', 'releaseDate', 'type'],
    artist: ['name', 'description', 'genres', 'coverUri', 'ogImage'],
}
export function metadataPatch(type: SpoofableType, value: any): any {
    const result: any = {}
    for (const field of fields[type]) {
        const entry = value?.[field]
        if (entry === undefined && field !== 'error') continue
        if (field === 'error') {
            if (Object.hasOwn(value ?? {}, field) && (entry == null || (typeof entry === 'string' && entry.length <= 4096)))
                result.error = entry ?? null
        } else if (field === 'available') {
            if (typeof entry === 'boolean') result[field] = entry
        } else if (field === 'year') {
            if (Number.isInteger(entry) && entry >= 0 && entry <= 9999) result[field] = entry
        } else if (field === 'genres') {
            if (Array.isArray(entry) && entry.length <= 100 && entry.every(x => typeof x === 'string' && x.length <= 4096)) result.genres = [...entry]
        } else if (typeof entry === 'string' && entry.length <= (field === 'description' ? 16384 : 4096)) result[field] = entry
    }
    if (value?.cover) {
        const cover = Object.fromEntries(
            ['uri', 'prefix', 'type'].filter(k => typeof value.cover[k] === 'string' && value.cover[k].length <= 4096).map(k => [k, value.cover[k]]),
        )
        if (Object.keys(cover).length) result.cover = cover
    }
    if (type !== 'artist' && Array.isArray(value?.artists) && value.artists.length <= 100) {
        result.artists = value.artists.map((a: any) => ({ id: String(a.id), ...metadataPatch('artist', a) }))
        if (result.artists.some((a: any) => !/^[A-Za-z0-9_-]{1,128}$/.test(a.id))) delete result.artists
    }
    return result
}
export function libraryId(value: unknown): string {
    const id = String(value)
    if (!/^[1-9]\d{0,15}$/.test(id) || !Number.isSafeInteger(Number(id))) throw Error('SDK library requires safe decimal Yandex IDs')
    return id
}
export function libraryTrack(value: any, albumId?: string): PulseSyncLibraryTrack {
    const id = libraryId(value.id),
        title = String(value.title || 'Без имени'),
        durationMs = typeof value.durationMs === 'number' ? Math.round(value.durationMs) : NaN
    if (!Number.isSafeInteger(durationMs) || durationMs <= 0 || durationMs > 86400000) throw Error(`Incomplete track ${id}`)
    const artists = (value.artists ?? []).map((a: any) => ({
        ...metadataPatch('artist', a),
        id: libraryId(a.id),
        name: String(a.name || 'Без имени'),
    }))
    const albums = (value.albums ?? [])
        .filter((a: any) => String(a.id) !== String(FALLBACK_ENTITY.id))
        .map((a: any) => ({
            ...metadataPatch('album', a),
            id: libraryId(a.id),
            title: String(a.title || 'Без имени'),
        }))
    if (albumId && !albums.some((a: any) => a.id === albumId)) albums.unshift({ id: albumId, title: 'Без имени' })
    return {
        ...metadataPatch('track', value),
        id,
        title,
        durationMs,
        available: value.available ?? true,
        artists,
        albums,
    }
}
export function libraryAlbum(value: any, volumes: PulseSyncLibraryTrack[][]): PulseSyncLibraryAlbum {
    return {
        ...metadataPatch('album', value),
        id: libraryId(value.id),
        title: String(value.title || 'Без имени'),
        available: value.available ?? true,
        artists: (value.artists ?? []).map((a: any) => ({
            ...metadataPatch('artist', a),
            id: libraryId(a.id),
            name: String(a.name || 'Без имени'),
        })),
        volumes,
    }
}
export function emptyMetadata(): PulseSyncMetadataOverrides {
    return { tracks: {}, albums: {}, artists: {} }
}

/** Child artist/album edits can also change an already visible track. */
export function metadataChanges(type: SpoofableType, original: any, current: any) {
    const before = metadataPatch(type, original),
        after = metadataPatch(type, current)
    return Object.fromEntries(Object.entries(after).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(before[key])))
}
