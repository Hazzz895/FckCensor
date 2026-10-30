import { sources } from '@/api/main-api'
import { FALLBACK_ENTITY } from '@/api/dto/fallback'
import { cloneEntity } from '@/utils/common'
import type { Album, Artist, Track } from '@/types'

export function buildCustomTrack(spoof: Partial<Track>, id: string | number): Track {
    const track: Record<string, unknown> = { ...cloneEntity(spoof) }
    const defaults: Record<string, unknown> = {
        type: 'music',
        durationMs: 0,
        available: false,
        hasTrackLink: false,
        albums: [{ ...FALLBACK_ENTITY }],
    }
    for (const [key, value] of Object.entries(defaults)) {
        if (track[key] === undefined) track[key] = value
    }
    track.id = Number(id)
    return track as unknown as Track
}

export function getCustomTrack(id: string): Track | null {
    const spoof = sources.getTrackSpoof(id)
    return spoof ? buildCustomTrack(spoof, id) : null
}

export function buildCustomAlbum(spoof: Partial<Album>, id: string | number): Album {
    const album: Record<string, unknown> = { ...cloneEntity(spoof) }
    const volumes = Array.isArray(album.volumes) ? (album.volumes as unknown[][]) : []
    const trackCount = volumes.reduce((count, volume) => count + volume.length, 0)
    const defaults: Record<string, unknown> = {
        type: trackCount === 1 ? 'single' : 'album',
        trackCount,
        volumes,
        artists: [],
        labels: [],
    }
    for (const [key, value] of Object.entries(defaults)) {
        if (album[key] === undefined) album[key] = value
    }
    album.available = true
    album.id = Number(id)
    return album as unknown as Album
}

export function getCustomAlbum(id: string): Album | null {
    const spoof = sources.getAlbumSpoof(id)
    return spoof ? buildCustomAlbum(spoof, id) : null
}

export function buildCustomArtist(spoof: Partial<Artist>, id: string | number): Artist {
    const artist: Record<string, unknown> = { ...cloneEntity(spoof) }
    const defaults: Record<string, unknown> = {
        name: FALLBACK_ENTITY.title,
        various: false,
        composer: false,
        available: true,
        genres: [],
        counts: { tracks: 0, directAlbums: 0, alsoAlbums: 0, alsoTracks: 0 },
    }
    for (const [key, value] of Object.entries(defaults)) {
        if (artist[key] === undefined) artist[key] = value
    }

    const coverUri = artist.coverUri as string | undefined
    if (coverUri) {
        if (!artist.ogImage) artist.ogImage = coverUri
        if (!artist.cover) artist.cover = { uri: coverUri }
    }

    artist.id = String(id)
    return artist as unknown as Artist
}

export function getCustomArtist(id: string): Artist | null {
    const spoof = sources.getArtistSpoof(id)
    return spoof ? buildCustomArtist(spoof, id) : null
}
