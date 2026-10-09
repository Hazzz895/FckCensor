import { Album, Artist, FckCensorSpoofData, OuterArtist, SearchResponse, SearchType, Spoofable, Track } from '@/types'
import { log } from './logger'
import { getDiResource } from './hook-utils'
import { runUnprotected } from './ui-utils'
import { fitArtists } from './common'

export function reloadPlayer(trackId?: string) {
    const e = window.sonataState?.queueState?.currentEntity?.value?.entity
    const mediaPlayer = window.sonataState?.currentMediaPlayer?.value?.currentMediaPlayer as any
    if (e && mediaPlayer && (!trackId || String(e.entityData?.meta?.id) == trackId)) {
        mediaPlayer.reload(e)
        log('Player reloaded')
    }
}

export function restoreOriginalValues(data: Spoofable, fckCensorData?: FckCensorSpoofData | null) {
    const source = fckCensorData ?? data.__fckCensor
    const originalValues = source?.originalValues
    if (!originalValues) return

    runUnprotected(data, () => {
        Object.assign(data, { ...originalValues, ...(originalValues.artists && { artists: fitArtists(data, originalValues.artists) }) })
    })

    delete source.originalValues
    if (data.__fckCensor && data.__fckCensor !== source) {
        delete data.__fckCensor.originalValues
    }
}

export function search(text: string, type: SearchType = 'all', page = 0, args: Record<string, any> = {}): Promise<SearchResponse | null> {
    return getDiResource('SearchResource')?.getInstantMixedSearch({
        text: text,
        type: type,
        page: page,
        ...args,
    })
}

export function searchArtists(text: string): Promise<SearchResponse | null> {
    return search(text, 'artist')
}

export function getAlbumTracks(albumId: TrackId, ...args: any): Promise<Album | null> {
    return getDiResource('AlbumResource')?.getAlbumWithRichTracks({
        albumId,
        ...args,
    })
}

export function getTracks(...trackIds: string[]): Promise<Track[]> {
    if (!trackIds.length) return Promise.resolve([])

    return getDiResource('TracksResource')?.getTracksMeta({ trackIds })
}

export function getAlbums(...albumIds: TrackId[]): Promise<Album[]> {
    albumIds = albumIds.map(Number).filter(x => !isNaN(x))

    if (!albumIds.length) return Promise.resolve([])

    return getDiResource('AlbumResource')?.getAlbums({
        albumIds: albumIds,
    })
}

export function getOuterArtist(artistId: TrackId): Promise<OuterArtist> {
    return getDiResource('ArtistsResource')?.getInfo({ artistId })
}

export async function getArtist(artistId: TrackId): Promise<Artist> {
    return (await getOuterArtist(artistId)).artist
}

export function getAudioMetadata(audioFile: File): Promise<HTMLAudioElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(audioFile)
        const audio = new Audio(url)
        audio
        audio.addEventListener('loadedmetadata', () => {
            URL.revokeObjectURL(url)
            resolve(audio)
        })

        audio.addEventListener('error', err => {
            URL.revokeObjectURL(url)
            reject(new Error(`Failed to read audio meta. ${err.error}`))
        })
    })
}

export const trackToQuery = (track: Track) => `${track.title} - ${track.artists?.map(x => x.name).join(', ')}`

export function lrcLineToTimestamp(lrc: string): number {
    const match = /^\[(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:\.(\d+))?\]/.exec(lrc.trim())

    if (!match) {
        return 0
    }

    const [, hours, minutes, seconds, fraction] = match

    const h = Number(hours ?? 0)
    const m = Number(minutes)
    const s = Number(seconds)

    const ms = fraction ? Number(fraction.padEnd(3, '0').slice(0, 3)) : 0

    return h * 3600000 + m * 60000 + s * 1000 + ms
}
