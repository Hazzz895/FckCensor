import { getSdkApi } from '@/sdk/lifecycle'
import { flushSdk } from '@/sdk/bridge'
import { Album, Artist, OuterArtist, SearchResponse, SearchType, Track } from '@/types'
import { readResource } from '@/sdk/resources'

export async function reloadPlayer(trackId?: string) {
    await flushSdk()
    const api = getSdkApi(),
        snapshot = await api?.player.getSnapshot(),
        track = snapshot?.track
    if (api && track && (!trackId || String(track.id) === trackId)) {
        await api.client.playTrackById(String(track.id))
        const progress = typeof snapshot?.progress === 'number' ? snapshot.progress : snapshot?.progress?.position
        if (typeof progress === 'number' && progress > 0) await api.client.setProgress(progress)
        if (!snapshot?.isPlaying) await api.client.pause()
    }
}

export function search(text: string, type: SearchType = 'all', page = 0, args: Record<string, any> = {}): Promise<SearchResponse | null> {
    return readResource<SearchResponse>(
        { resource: 'search', method: 'getInstantMixedSearch' },
        {
            text: text,
            type: type,
            page: page,
            ...args,
        },
    )
}

export function searchArtists(text: string): Promise<SearchResponse | null> {
    return search(text, 'artist')
}

export function getAlbumTracks(albumId: TrackId, ...args: any): Promise<Album | null> {
    return readResource<Album>(
        { resource: 'albums', method: 'getAlbumWithRichTracks' },
        {
            albumId,
            ...args,
        },
    )
}

export function getTracks(...trackIds: string[]): Promise<Track[]> {
    if (!trackIds.length) return Promise.resolve([])

    return readResource<Track[]>({ resource: 'tracks', method: 'getTracksMeta' }, { trackIds })
}

export function getAlbums(...albumIds: TrackId[]): Promise<Album[]> {
    albumIds = albumIds.map(Number).filter(x => !isNaN(x))

    if (!albumIds.length) return Promise.resolve([])

    return readResource<Album[]>(
        { resource: 'albums', method: 'getAlbums' },
        {
            albumIds: albumIds,
        },
    )
}

export function getOuterArtist(artistId: TrackId): Promise<OuterArtist> {
    return readResource<OuterArtist>({ resource: 'artists', method: 'getInfo' }, { artistId })
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
