import { getSdkApi } from '@/sdk/lifecycle'
import { flushSdk } from '@/sdk/bridge'
import { Album, Artist, OuterArtist, SearchResponse, SearchType, Track } from '@/types'
import { readResource } from '@/sdk/resources'
import { log } from './logger'
import { customIdOf } from '@/ui/components/alerts/spoof/custom-entities/custom-entity-requests'
import { getCustomAlbum, getCustomTrack } from '@/ui/components/alerts/spoof/custom-entities/custom-entity-build'
import { isCustomEntity } from '@/ui/components/alerts/spoof/custom-entities/custom-entity-id-counter'

export async function reloadPlayer(trackId?: string) {
    await flushSdk()
    await getSdkApi()?.pulsesyncApi?.reloadPlayer(trackId)
    log("Player reloaded")
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

const readTracks = (trackIds: string[]) => readResource<Track[]>({ resource: 'tracks', method: 'getTracksMeta' }, { trackIds })
const readAlbums = (albumIds: TrackId[]) => readResource<Album[]>({ resource: 'albums', method: 'getAlbums' }, { albumIds })

export async function getTracks(...trackIds: string[]): Promise<Track[]> {
    if (!trackIds.length) return []
    if (!trackIds.some(id => customIdOf(id) !== null)) return readTracks(trackIds)

    const realIds = trackIds.filter(id => customIdOf(id) === null)
    const fetched = realIds.length ? await readTracks(realIds) : []
    const fetchedById = new Map(fetched.map(track => [String(track.id), track]))

    const result: Track[] = []
    for (const item of trackIds) {
        const customId = customIdOf(item)
        const track = customId !== null ? getCustomTrack(customId) : fetchedById.get(String(item).split(':', 1)[0])
        if (track) result.push(track)
    }
    return result
}

export async function getAlbums(...albumIds: TrackId[]): Promise<Album[]> {
    const ids = albumIds.map(Number).filter(x => !isNaN(x))

    if (!ids.length) return []
    if (!ids.some(isCustomEntity)) return readAlbums(ids)

    const realIds = ids.filter(id => !isCustomEntity(id))
    const fetched = realIds.length ? await readAlbums(realIds) : []
    const fetchedById = new Map(fetched.map(album => [String(album.id), album]))

    const result: Album[] = []
    for (const id of ids) {
        const album = isCustomEntity(id) ? getCustomAlbum(String(id)) : fetchedById.get(String(id))
        if (album) result.push(album)
    }
    return result
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
