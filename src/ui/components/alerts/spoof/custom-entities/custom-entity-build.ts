import { sources } from '@/api/main-api'
import { FALLBACK_ENTITY } from '@/api/dto/fallback'
import { cloneEntity } from '@/utils/common'
import type { Album, Track } from '@/types'

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

export function getCustomAlbum(id: string): Album | null {
    const spoof = sources.getAlbumSpoof(id)
    return spoof ? ({ ...cloneEntity(spoof), id: Number(id) } as Album) : null
}
