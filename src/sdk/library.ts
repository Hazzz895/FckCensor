import type { AddonApi, PulseSyncLibraryTrack } from '@pulsesync/addon-sdk'
import { sources } from '@/api/main-api'
import { cloneEntity } from '@/utils/common'
import { settings } from '@/settings'
import { getTracks } from '@/utils/music'
import type { Track } from '@/types'
import { known } from './metadata-sync'
import { libraryId, libraryTrack } from './metadata'

const libraryAlbums = new Set<string>()
let libraryJson = ''
let dataGeneration = 0
const nativeTracks = new Map<string, Track>()
const fallbackReasons = new Map<string, string>()

function warnFallback(api: AddonApi, id: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    const key = `album:${id}`
    if (fallbackReasons.get(key) === message) return
    fallbackReasons.set(key, message)
    api.logger.warn(`Library replacement uses resource hooks: ${message}`, id, error)
}

export function isSdkLibraryArtist(_id: string) {
    return false
}

export function isSdkLibraryAlbum(id: string) {
    return libraryAlbums.has(String(id))
}

export function resetLibraryState() {
    libraryJson = ''
    dataGeneration++
    nativeTracks.clear()
    fallbackReasons.clear()
    libraryAlbums.clear()
}

export async function syncLibrary(api: AddonApi, stillCurrent: () => boolean) {
    const payload: {
        artists: Record<string, never>
        albums: Record<string, { volumes: PulseSyncLibraryTrack[][] }>
    } = { artists: {}, albums: {} }
    const albums = new Set<string>()
    let tracksCount = 0
    let entries = 0

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
                const id = String(track.id)
                const raw = cloneEntity(track)
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
                const albumId = libraryId(id)
                const count = spoof.volumes.flat().length
                if (count + tracksCount > 1000) continue
                const volumes = []
                for (const volume of spoof.volumes) volumes.push(await getVolume(volume, albumId))
                if (!stillCurrent()) return
                payload.albums[albumId] = { volumes }
                albums.add(albumId)
                fallbackReasons.delete(`album:${id}`)
                tracksCount += count
                entries++
            } catch (error) {
                if (!stillCurrent()) return
                warnFallback(api, id, error)
            }
        }
    }

    if (!stillCurrent()) return
    payload.albums = Object.fromEntries(Object.entries(payload.albums).sort(([a], [b]) => a.localeCompare(b)))
    const json = JSON.stringify(payload)
    if (json === libraryJson) return

    const oldAlbums = [...libraryAlbums]
    libraryAlbums.clear()
    albums.forEach(id => libraryAlbums.add(id))

    try {
        await api.client.setLibraryOverrides(payload)
        if (stillCurrent()) libraryJson = json
    } catch (error) {
        libraryAlbums.clear()
        oldAlbums.forEach(id => libraryAlbums.add(id))
        throw error
    }
}
