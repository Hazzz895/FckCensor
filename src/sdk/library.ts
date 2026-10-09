import type { AddonApi, PulseSyncArtistLibraryOverride, PulseSyncLibraryTrack, PulseSyncLibraryAlbum } from '@pulsesync/addon-sdk'
import { sources } from '@/api/main-api'
import { cloneEntity } from '@/utils/common'
import { settings } from '@/settings'
import { getTracks, getAlbumTracks } from '@/utils/music'
import type { Track, Album } from '@/types'
import { known } from './metadata-sync'
import { libraryId, libraryTrack, libraryAlbum } from './metadata'
const libraryArtists = new Set<string>()
const libraryAlbums = new Set<string>()
let libraryJson = ''
let dataGeneration = 0
const nativeTracks = new Map<string, Track>()
const nativeAlbums = new Map<string, Album>()
const fallbackReasons = new Map<string, string>()
function warnFallback(api: AddonApi, type: 'album' | 'artist', id: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    const key = `${type}:${id}`
    if (fallbackReasons.get(key) === message) return
    fallbackReasons.set(key, message)
    const scope = type === 'album' ? 'Library replacement' : 'Artist insertions'
    api.logger.warn(`${scope} uses resource hooks: ${message}`, id, error)
}
export function isSdkLibraryArtist(id: string) {
    return libraryArtists.has(String(id))
}
export function isSdkLibraryAlbum(id: string) {
    return libraryAlbums.has(String(id))
}
export function resetLibraryState() {
    libraryJson = ''
    dataGeneration++
    nativeTracks.clear()
    nativeAlbums.clear()
    fallbackReasons.clear()
    libraryArtists.clear()
    libraryAlbums.clear()
}
export async function syncLibrary(api: AddonApi, stillCurrent: () => boolean) {
    const payload: {
        artists: Record<string, PulseSyncArtistLibraryOverride>
        albums: Record<string, { volumes: PulseSyncLibraryTrack[][] }>
    } = { artists: {}, albums: {} }
    const artists = new Set<string>(),
        albums = new Set<string>()
    let tracksCount = 0,
        entries = 0
    const toTrack = (value: any, albumId?: string) => {
        const track = cloneEntity(value)
        sources.spoofTrack(track)
        return libraryTrack(track, albumId)
    }
    const getVolume = async (ids: any[], albumId?: string) => {
        if (!stillCurrent()) throw Error('Library synchronization cancelled')
        const requested = ids.map(t => libraryId(t.id ?? t))
        const values = new Map(nativeTracks)
        const missing = [...new Set(requested.filter(id => !values.has(id)))]
        const generation = dataGeneration
        if (missing.length) {
            const fetched = await getTracks(...missing)
            if (!stillCurrent() || generation !== dataGeneration) throw Error('Library synchronization cancelled')
            for (const track of fetched) {
                const id = String(track.id),
                    raw = cloneEntity(track)
                values.set(id, raw)
                nativeTracks.delete(id)
                nativeTracks.set(id, raw)
            }
            while (nativeTracks.size > 1000) nativeTracks.delete(nativeTracks.keys().next().value!)
        }
        return requested.map(id => {
            const value = values.get(id)
            if (!value) throw Error(`Missing library track ${id}`)
            return toTrack(value, albumId)
        })
    }
    if (!settings.store.liteMode) {
        for (const id of known('album')) {
            const spoof = sources.getAlbumSpoof(id)
            if (!spoof?.volumes || entries >= 1000) continue
            try {
                const albumId = libraryId(id),
                    count = spoof.volumes.flat().length
                if (count + tracksCount > 1000) continue
                const volumes = []
                for (const volume of spoof.volumes) volumes.push(await getVolume(volume, albumId))
                if (!stillCurrent()) return
                payload.albums![albumId] = { volumes }
                albums.add(albumId)
                fallbackReasons.delete(`album:${id}`)
                tracksCount += count
                entries++
            } catch (error) {
                if (!stillCurrent()) return
                warnFallback(api, 'album', id, error)
            }
        }
        for (const id of known('artist')) {
            const insertions = sources.getArtistInsertions(id)
            if (!insertions || entries >= 1000) continue
            try {
                const artistId = libraryId(id),
                    tracks: { index: number; track: PulseSyncLibraryTrack }[] = [],
                    albumsData: { index: number; album: PulseSyncLibraryAlbum }[] = []
                let count = 0
                const index = (value: number | undefined) => {
                    if (value === undefined || value === -1) return 5000
                    if (!Number.isSafeInteger(value) || value < 0 || value > 5000) throw Error('Relative insertion uses resource hooks')
                    return value
                }
                for (const insertion of insertions.tracks ?? []) {
                    const position = index(insertion.index)
                    const [track] = await getVolume([insertion.releaseId])
                    tracks.push({ index: position, track })
                    count++
                }
                for (const insertion of insertions.albums ?? []) {
                    const position = index(insertion.index),
                        albumId = libraryId(insertion.releaseId)
                    if (!stillCurrent()) return
                    let native = nativeAlbums.get(albumId)
                    if (!native) {
                        const generation = dataGeneration
                        const fetched = await getAlbumTracks(albumId)
                        if (!stillCurrent() || generation !== dataGeneration) return
                        if (!fetched?.volumes) throw Error(`Missing library album ${albumId}`)
                        native = cloneEntity(fetched)
                        nativeAlbums.set(albumId, native)
                        while (nativeAlbums.size > 16) nativeAlbums.delete(nativeAlbums.keys().next().value!)
                    }
                    const raw = cloneEntity(native)
                    if (!raw.volumes) throw Error(`Missing library album ${albumId}`)
                    sources.spoofAlbum(raw)
                    const volumes = []
                    for (const volume of raw.volumes) volumes.push(await getVolume(volume, String(raw.id)))
                    count += volumes.flat().length
                    albumsData.push({ index: position, album: libraryAlbum(raw, volumes) })
                }
                if (!stillCurrent()) return
                if (count + tracksCount > 1000) continue
                payload.artists![artistId] = { tracks, albums: albumsData }
                artists.add(artistId)
                fallbackReasons.delete(`artist:${id}`)
                tracksCount += count
                entries++
            } catch (error) {
                if (!stillCurrent()) return
                warnFallback(api, 'artist', id, error)
            }
        }
    }
    if (!stillCurrent()) return
    payload.albums = Object.fromEntries(Object.entries(payload.albums).sort(([a], [b]) => a.localeCompare(b)))
    payload.artists = Object.fromEntries(Object.entries(payload.artists).sort(([a], [b]) => a.localeCompare(b)))
    const json = JSON.stringify(payload)
    if (json === libraryJson) return
    const oldArtists = [...libraryArtists],
        oldAlbums = [...libraryAlbums]
    libraryArtists.clear()
    libraryAlbums.clear()
    artists.forEach(id => libraryArtists.add(id))
    albums.forEach(id => libraryAlbums.add(id))
    try {
        await api.client.setLibraryOverrides(payload)
        if (stillCurrent()) libraryJson = json
    } catch (error) {
        libraryArtists.clear()
        libraryAlbums.clear()
        oldArtists.forEach(id => libraryArtists.add(id))
        oldAlbums.forEach(id => libraryAlbums.add(id))
        throw error
    }
}
