import { sources } from '@/api/main-api'
import type { PulseSyncResourceTarget } from '@pulsesync/addon-sdk'
import { getSdkApi } from '@/sdk/lifecycle'
import { rememberResponse, requestSdkSync, isSdkLibraryArtist, isSdkLibraryAlbum } from '@/sdk/bridge'
import { debug, error } from '@/utils/logger'
import { Album, Artist, OuterArtist, Playlist, SearchResponse, Track } from '@/types'
import { insert } from '@/utils/common'
import { getAlbums, getTracks } from '@/utils/music'
import addonConfig from '../../addon.config.mjs'
import { showNotificationSafe } from '@/utils/ui-utils'
import { settings } from '@/settings'
import {
    CustomIdsStash,
    customIdOf,
    requestFingerprint,
    splitAlbumIds,
    splitTrackIds,
    takeCustomIds,
} from '@/ui/components/alerts/spoof/custom-entities/custom-entity-requests'
import { getCustomAlbum, getCustomArtist, getCustomTrack } from '@/ui/components/alerts/spoof/custom-entities/custom-entity-build'
import { ArtistLandingBlockType } from "@/ui/components/alerts/spoof/custom-entities/custom-entity-artists"
import { createArtistLandingBlock } from "@/ui/components/alerts/spoof/custom-entities/custom-entity-artists"
import { createArtistPager } from "@/ui/components/alerts/spoof/custom-entities/custom-entity-artists"
import { createArtistSkeleton } from "@/ui/components/alerts/spoof/custom-entities/custom-entity-artists"
import { prepareButtons, unhookButtons } from './ui/buttons'

const heavyMethodsUnhooks: (() => void)[] = []
let hookGeneration = 0
let hooksStarting: Promise<void>[] = []
let registration: { generation: number; promise: Promise<void> } | undefined

class EarlyResponse {
    constructor(public readonly result: unknown) {}
}
class FunctionHook {
    before(_original: Function, _request: any): EarlyResponse | void | Promise<EarlyResponse | void> {}
    after(_result: any, _request?: any): any {}
}
type Hook = FunctionHook | ((result: any, request: any) => any)
function hookHeavyMethods(resource: PulseSyncResourceTarget['resource'], hook: Hook, ...methodNames: string[]) {
    if (settings.store.liteMode) return
    const api = getSdkApi()
    if (!api) throw Error('SDK lifecycle is not active')
    const generation = hookGeneration
    for (const method of methodNames) {
        hooksStarting.push(
            api.resources
                .registerHook({ resource, method } as PulseSyncResourceTarget, {
                    timeoutMs: 5000,
                    before:
                        hook instanceof FunctionHook
                            ? async ({ request }) => {
                                  const mutable = structuredClone(request)
                                  const early = await hook.before(() => {}, mutable)
                                  if (early instanceof EarlyResponse) {
                                      rememberResponse(early.result)
                                      requestSdkSync(false)
                                      return { kind: 'respond' as const, result: JSON.parse(JSON.stringify(early.result)) }
                                  }
                                  return { kind: 'continue' as const, request: mutable }
                              }
                            : undefined,
                    after: async ({ result, request }) => {
                        rememberResponse(result)
                        if (hook instanceof FunctionHook) await hook.after(result, request)
                        else await hook(result, request)
                        requestSdkSync(false)
                        // Sources contain optional undefined fields; the SDK hook boundary accepts JSON only.
                        return { kind: 'replace', result: JSON.parse(JSON.stringify(result)) }
                    },
                })
                .then(cleanup => {
                    if (generation !== hookGeneration || api.signal.aborted || settings.store.liteMode) cleanup()
                    else heavyMethodsUnhooks.push(cleanup)
                }),
        )
    }
}

export function stopResourceHooks() {
    hookGeneration++
    for (const cleanup of heavyMethodsUnhooks.splice(0)) cleanup()
}

function spoofTrackSafe(track: Track) {
    try {
        sources.spoofTrack(track)
    } catch (e) {
        error(e)
    }
}

class GetTracksMetaHook extends FunctionHook {
    private readonly pendingCustomIds = new CustomIdsStash()

    public before(_originalMethod: Function, request: { trackIds?: TrackId[] }) {
        if (!Array.isArray(request?.trackIds)) {
            return
        }

        const { rest, customIds } = splitTrackIds(request.trackIds)
        request.trackIds = rest as TrackId[]
        if (!customIds.length) return

        if (!rest.length) {
            const tracks = customIds.flatMap(id => getCustomTrack(id) ?? [])
            tracks.forEach(spoofTrackSafe)
            return new EarlyResponse(tracks)
        }

        this.pendingCustomIds.put(requestFingerprint(rest), customIds)
    }

    public after(tracks: Track[], request?: { trackIds?: TrackId[] }) {
        if (Array.isArray(tracks)) {
            const present = new Set(tracks.map(t => String(t.id)))
            for (const id of takeCustomIds(this.pendingCustomIds, request?.trackIds, splitTrackIds)) {
                if (present.has(id)) continue
                const track = getCustomTrack(id)
                if (!track) continue
                tracks.push(track)
                present.add(id)
            }

            tracks.forEach(spoofTrackSafe)
        } else {
            sources.spoofTrack(tracks)
        }
        return tracks
    }
}

function spoofAlbumSafe(album: Album) {
    try {
        sources.spoofAlbum(album)
    } catch (e) {
        error(e)
    }
}

class GetAlbumsHook extends FunctionHook {
    private readonly pendingCustomIds = new CustomIdsStash()

    public before(_originalMethod: Function, request: { albumIds?: TrackId[] }) {
        if (!Array.isArray(request?.albumIds)) return

        const { rest, customIds } = splitAlbumIds(request.albumIds)
        request.albumIds = rest as TrackId[]
        if (!customIds.length) return

        if (!rest.length) {
            const albums = customIds.flatMap(id => getCustomAlbum(id) ?? [])
            albums.forEach(spoofAlbumSafe)
            return new EarlyResponse(albums)
        }

        this.pendingCustomIds.put(requestFingerprint(rest), customIds)
    }

    public after(albums: Album[], request?: { albumIds?: TrackId[] }) {
        if (!Array.isArray(albums)) return

        const present = new Set(albums.map(a => String(a.id)))
        for (const id of takeCustomIds(this.pendingCustomIds, request?.albumIds, splitAlbumIds)) {
            if (present.has(id)) continue
            const album = getCustomAlbum(id)
            if (!album) continue
            albums.push(album)
            present.add(id)
        }

        albums.forEach(spoofAlbumSafe)
    }
}

class GetFullInfoTrackHook extends GetTracksMetaHook {
    public after(envelope: any) {
        const info = envelope?.data ?? envelope
        if (info && 'track' in info) {
            sources.spoofTrack(info.track)
            if (Array.isArray(info.similarTracks)) {
                for (const st of info.similarTracks) {
                    try {
                        sources.spoofTrack(st)
                    } catch (e) {
                        error(e)
                    }
                }
            }
        }
        return envelope
    }
}

function hookTrackResource(tr: any) {
    hookHeavyMethods(tr, new GetTracksMetaHook(), 'getTracksMeta')
    hookHeavyMethods(tr, new GetFullInfoTrackHook(), 'getFullInfoTrack', 'getFullInfoTrackWithEtag')
}

async function spoofAlbumWithTracksIds(albums: any) {
    if (Array.isArray(albums)) {
        for (const a of albums) {
            try {
                sources.spoofAlbum(a)
            } catch (e) {
                error(e)
            }
        }
    } else if (albums && !albums.notModified) {
        try {
            const value = (albums as any).data ?? albums
            const volumes = value.volumes
            sources.spoofAlbum(value)
            if (isSdkLibraryAlbum(String(value.id))) value.volumes = volumes
        } catch (e) {
            error(e)
        }
    }
}

async function spoofAlbumWithRichTracks(albums: any) {
    async function spoof(a: Album) {
        const nativeVolumes = a.volumes
        try {
            const spoof = sources.spoofAlbum(a)
            // Never leave ID-only or partially fetched volumes in a rich-track response.
            a.volumes = nativeVolumes
            if (isSdkLibraryAlbum(String(a.id))) {
                nativeVolumes?.flat().forEach(track => sources.spoofTrack(track))
                return
            }
            if (spoof?.volumes) {
                const tracks = await getTracks(...spoof.volumes.flatMap(v => v.map(t => String(t.id))))
                const volumes = spoof.volumes.map(volume =>
                    volume.map(ref => {
                        const track = tracks.find(t => String(t.id) === String(ref.id))
                        if (!track) throw Error(`Missing replacement track ${ref.id}`)
                        return track
                    }),
                )
                a.volumes = volumes
            }
        } catch (e) {
            a.volumes = nativeVolumes
            error(e)
        }
    }

    if (Array.isArray(albums)) {
        for (const a of albums) {
            await spoof(a)
        }
    } else if (albums) {
        await spoof(albums)
    }
}

class GetAlbumWithTracksHook extends FunctionHook {
    constructor(
        private readonly spoofResponse: (response: any) => Promise<void>,
        private readonly options: { withEtag?: boolean; richTracks?: boolean } = {},
    ) {
        super()
    }

    public async before(_originalMethod: Function, request: { albumId?: TrackId }) {
        const id = customIdOf(request?.albumId)
        if (id === null) return

        const album = getCustomAlbum(id)
        if (!album) return
        if (this.options.richTracks) album.volumes = []

        const response = this.options.withEtag ? { notModified: false, data: album, etag: `"fck-custom-${id}-${Date.now()}"` } : album
        await this.spoofResponse(response)
        return new EarlyResponse(response)
    }

    public async after(response: any) {
        await this.spoofResponse(response)
    }
}

function hookAlbumResource(ar: any) {
    hookHeavyMethods(ar, new GetAlbumsHook(), 'getAlbums')
    hookHeavyMethods(ar, new GetAlbumWithTracksHook(spoofAlbumWithTracksIds), 'getAlbumWithTracksIds')
    hookHeavyMethods(ar, new GetAlbumWithTracksHook(spoofAlbumWithTracksIds, { withEtag: true }), 'getAlbumWithTracksIdsWithEtag')
    hookHeavyMethods(ar, new GetAlbumWithTracksHook(spoofAlbumWithRichTracks, { richTracks: true }), 'getAlbumWithRichTracks')
}

type ArtistResourceRequest = {
    artistId?: TrackId
    page?: number
    pageSize?: number
    per?: number
    type?: ArtistLandingBlockType
    source?: { uri?: string }
}
type ArtistInfoResponse = OuterArtist & { covers?: unknown[] }

function getLocalArtistId(artistId: unknown): string | null {
    const id = customIdOf(artistId)
    return id !== null && getCustomArtist(id) ? id : null
}

function getArtistIdFromUri(uri?: string): string | null {
    return uri?.match(/\/artists\/([^/?#]+)(?:\/|$)/)?.[1] ?? null
}

function paginateItems<T>(items: T[], request: ArtistResourceRequest) {
    const pager = createArtistPager(request, items.length)
    const start = pager.page * pager.per
    return {
        pager,
        items: pager.per > 0 ? items.slice(start, start + pager.per) : items,
    }
}

class ArtistInfoHook extends FunctionHook {
    constructor(private readonly brief = false) {
        super()
    }

    public async before(_originalMethod: Function, request: ArtistResourceRequest) {
        const id = getLocalArtistId(request?.artistId)
        if (id === null) return
        const artist = getCustomArtist(id)
        if (!artist) return

        let response: ArtistInfoResponse
        if (this.brief) {
            const tracks: Track[] = []
            const albums: Album[] = []
            try {
                await Promise.all([addInsertionsToTracksList(tracks, id), addInsertionsToAlbumsList(albums, id)])
            } catch (e) {
                error(`Failed to load insertions for local artist ${id}:`, e)
            }
            response = { artist, popularTracks: tracks, albums }
        } else {
            response = { artist, covers: [], stats: {} }
        }

        await this.after(response)
        return new EarlyResponse(response)
    }

    public after(response: ArtistInfoResponse) {
        if (response?.artist) sources.spoofAnyArtist(response)
        response?.popularTracks?.forEach(spoofTrackSafe)
        response?.albums?.forEach(spoofAlbumSafe)
        response?.alsoAlbums?.forEach(spoofAlbumSafe)
    }
}

class ArtistSkeletonHook extends FunctionHook {
    public before(_originalMethod: Function, request: ArtistResourceRequest) {
        const id = getLocalArtistId(request?.artistId)
        if (id === null) return
        return new EarlyResponse(createArtistSkeleton(id))
    }
}

class ArtistTrackIdsHook extends FunctionHook {
    public before(_originalMethod: Function, request: ArtistResourceRequest) {
        const id = getLocalArtistId(request?.artistId)
        if (id === null) return
        const trackIds: string[] = []
        sources.getArtistInsertions(id)?.tracks?.forEach(insertion => {
            insert(trackIds, insertion.releaseId, insertion.index)
        })
        return new EarlyResponse(trackIds)
    }

    public after(trackIds: string[], request: ArtistResourceRequest) {
        const artistId = String(request?.artistId)
        if (!isSdkLibraryArtist(artistId)) {
            const present = new Set(trackIds.map(String))
            sources.getArtistInsertions(artistId)?.tracks?.forEach(insertion => {
                if (present.has(String(insertion.releaseId))) return
                insert(trackIds, insertion.releaseId, insertion.index)
                present.add(String(insertion.releaseId))
            })
        }
    }
}

class ArtistTracksHook extends FunctionHook {
    public async before(_originalMethod: Function, request: ArtistResourceRequest) {
        const id = getLocalArtistId(request?.artistId)
        if (id === null) return
        const tracks: Track[] = []
        try {
            await addInsertionsToTracksList(tracks, id)
        } catch (e) {
            error(`Failed to load tracks for local artist ${id}:`, e)
        }
        tracks.forEach(spoofTrackSafe)
        const { items, pager } = paginateItems(tracks, request)
        return new EarlyResponse({ pager, tracks: items })
    }

    public async after(result: { pager?: any; tracks?: Track[] } | Track[], request: ArtistResourceRequest) {
        const tracks = Array.isArray(result) ? result : result?.tracks
        if (!tracks) return
        try {
            const previousCount = tracks.length
            await addInsertionsToTracksList(tracks, String(request?.artistId))
            if (!Array.isArray(result) && result.pager?.total !== undefined) {
                result.pager.total = Number(result.pager.total) + tracks.length - previousCount
            }
        } catch (e) {
            error(e)
        }
    }
}

class ArtistAlbumsHook extends FunctionHook {
    public async before(_originalMethod: Function, request: ArtistResourceRequest) {
        const id = getLocalArtistId(request?.artistId)
        if (id === null) return
        const albums: Album[] = []
        try {
            await addInsertionsToAlbumsList(albums, id)
        } catch (e) {
            error(`Failed to load albums for local artist ${id}:`, e)
        }
        albums.forEach(spoofAlbumSafe)
        const { items, pager } = paginateItems(albums, request)
        return new EarlyResponse({ pager, albums: items })
    }

    public async after(result: { pager?: any; albums?: Album[] } | Album[], request: ArtistResourceRequest) {
        const albums = Array.isArray(result) ? result : result?.albums
        if (!albums) return
        try {
            const previousCount = albums.length
            await addInsertionsToAlbumsList(albums, String(request?.artistId))
            if (!Array.isArray(result) && result.pager?.total !== undefined) {
                result.pager.total = Number(result.pager.total) + albums.length - previousCount
            }
        } catch (e) {
            error(e)
        }
    }
}

class LocalArtistStubHook extends FunctionHook {
    constructor(private readonly method: string) {
        super()
    }

    public before(_originalMethod: Function, request: ArtistResourceRequest) {
        if (getLocalArtistId(request?.artistId) === null) return
        return new EarlyResponse({
                wave: { tracks: [] },
                collection: { tracks: [], albums: [] },
            })
    }

    public after(familiar: any) {
        if (this.method !== 'getFamiliarYou') return

        function spoofTab(tab: any) {
            if (!tab) return
            if (Array.isArray(tab.tracks)) tab.tracks.forEach(spoofTrackSafe)
            if (Array.isArray(tab.albums)) tab.albums.forEach(spoofAlbumSafe)
        }

        spoofTab(familiar?.wave)
        spoofTab(familiar?.collection)
    }
}

function hookArtistResource(ar: any) {
    hookHeavyMethods(ar, new ArtistInfoHook(), 'getInfo')
    hookHeavyMethods(ar, new ArtistInfoHook(true), 'getBriefInfo')
    hookHeavyMethods(ar, new ArtistSkeletonHook(), 'getSkeleton')
    hookHeavyMethods(ar, new ArtistTrackIdsHook(), 'getArtistTrackIds')
    hookHeavyMethods(ar, new ArtistTracksHook(), 'getArtistTracks')
    hookHeavyMethods(ar, new ArtistAlbumsHook(), 'getDirectAlbums')
    hookHeavyMethods(ar, new LocalArtistStubHook('getFamiliarYou'), 'getFamiliarYou')
}

async function addInsertionsToTracksList(tracks: Track[], artistId: string) {
    if (isSdkLibraryArtist(artistId)) return
    const insertions = sources.getArtistInsertions(artistId)?.tracks
    if (insertions) {
        const insertionTracksMeta = new Map((await getTracks(...insertions.map(x => x.releaseId))).map(t => [String(t.id), t]))
        const present = new Set(tracks.map(track => String(track.id)))
        insertions.forEach(insertion => {
            const meta = insertionTracksMeta.get(String(insertion.releaseId).split(':', 1)[0])
            if (meta && !present.has(String(meta.id))) {
                insert(tracks, meta, insertion.index)
                present.add(String(meta.id))
            }
        })
    }
    return insertions
}

async function addInsertionsToAlbumsList(albums: Album[], artistId: string) {
    if (isSdkLibraryArtist(artistId)) return
    const insertions = sources.getArtistInsertions(artistId)?.albums
    if (insertions) {
        const insertionAlbumsMeta = new Map((await getAlbums(...insertions.map(x => x.releaseId))).map(a => [String(a.id), a]))
        const present = new Set(albums.map(album => String(album.id)))
        insertions.forEach(insertion => {
            const meta = insertionAlbumsMeta.get(String(insertion.releaseId))
            if (meta && !present.has(String(meta.id))) {
                insert(albums, meta, insertion.index)
                present.add(String(meta.id))
            }
        })
    }
    return insertions
}

async function enrichLandingBlock(block: any, info: ArtistResourceRequest) {
    if (!block || typeof block !== 'object') return
    const artistId = getArtistIdFromUri(info.source?.uri)

    if (Array.isArray(block.tracks)) {
        if (info.type === 'ARTIST_POPULAR_TRACKS' && artistId) {
            const previousCount = block.tracks.length
            try {
                await addInsertionsToTracksList(block.tracks, artistId)
                if (block.pager?.total !== undefined) {
                    block.pager.total = Number(block.pager.total) + block.tracks.length - previousCount
                }
            } catch (e) {
                error(`Failed to load track insertions for artist ${artistId}:`, e)
            }
        }
        block.tracks.forEach(spoofTrackSafe)
    }

    if (block.release) {
        if (block.release.album) spoofAlbumSafe(block.release.album)
        if (Array.isArray(block.release.artists)) block.release.artists.forEach((artist: Artist) => sources.spoofAnyArtist(artist))
    }

    if (Array.isArray(block.items)) {
        if (info.type === 'ARTIST_ALBUMS' && artistId) {
            const albums: Album[] = []
            try {
                const insertions = await addInsertionsToAlbumsList(albums, artistId)
                const albumsById = new Map(albums.map(album => [String(album.id), album]))
                insertions?.forEach(insertion => {
                    const album = albumsById.get(String(insertion.releaseId))
                    if (!album) return
                    const data = {
                        type: 'album_item',
                        data: {
                            album,
                            artists: album.artists ?? [],
                            releaseDate: album.releaseDate,
                        },
                    }
                    insert(block.items, data, insertion.index)
                })
            } catch (e) {
                error(`Failed to load album insertions for artist ${artistId}:`, e)
            }
        }

        for (const item of block.items) {
            switch (item.type) {
                case 'album_item':
                    if (item.data?.album) spoofAlbumSafe(item.data.album)
                    for (const artist of item.data?.artists ?? item.data?.album?.artists ?? []) {
                        sources.spoofAnyArtist(artist)
                    }
                    break
                case 'artist_item':
                    if (item.data?.artist) sources.spoofAnyArtist(item.data.artist)
            }
        }
    }
}

class LandingBlockHook extends FunctionHook {
    public async before(_originalMethod: Function, request: ArtistResourceRequest) {
        const customId = customIdOf(getArtistIdFromUri(request?.source?.uri))
        if (customId === null || !getCustomArtist(customId)) return

        const block = createArtistLandingBlock(request.type, request)
        await enrichLandingBlock(block, request)
        return new EarlyResponse(block)
    }

    public async after(block: any, request: ArtistResourceRequest) {
        await enrichLandingBlock(block, request)
    }
}

function hookLandingResource(lr: any) {
    hookHeavyMethods(lr, new LandingBlockHook(), 'getBlock')
}

function hookSearchResource(sr: any) {
    hookHeavyMethods(
        sr,
        async (response: SearchResponse) => {
            if (Array.isArray(response.bestResults)) {
                for (const best of response.bestResults) {
                    if (best.best_result_track) sources.spoofTrack(best.best_result_track)
                    if (best.best_result_album) sources.spoofAlbum(best.best_result_album)
                    if (best.best_result_artist) sources.spoofAnyArtist(best.best_result_artist)
                }
            }

            if (Array.isArray(response.results)) {
                for (const r of response.results) {
                    if (r.album) sources.spoofAlbum(r.album)
                    if (r.artist) sources.spoofAnyArtist(r.artist)
                    if (r.track) sources.spoofTrack(r.track)
                }
            }
        },
        'getInstantMixedSearch',
    )
}

function hookChartResource(cr: any) {
    hookHeavyMethods(
        cr,
        async (chart: { chart: Playlist }) => {
            debug(chart, Array.isArray(chart?.chart?.tracks))
            if (Array.isArray(chart?.chart?.tracks)) {
                for (const t of chart.chart.tracks) {
                    if (!t.track) continue
                    sources.spoofTrack(t.track)
                }
            }
        },
        'getChart',
    )
}

export function hookRotorResource(doubleRR: any) {
    hookHeavyMethods(
        doubleRR,
        async (session: { sequence: { track?: Track }[] }) => {
            if (Array.isArray(session?.sequence)) {
                for (const seq of session.sequence) {
                    if (!seq.track) continue
                    sources.spoofTrack(seq.track)
                }
            }
        },
        'sessionTracks',
        'sessionNew',
        'sessionClone',
        'sessionFeedback',
        'sessionFeedbacks',
        'sessionsFeedbacks',
        'combinedSessionNew',
        'combinedSessionNext',
    )
}

export function hookResources(): Promise<void> {
    if (registration?.generation === hookGeneration) return registration.promise
    if (heavyMethodsUnhooks.length || settings.store.liteMode) return Promise.resolve()
    hooksStarting = []
    hookTrackResource('tracks')
    hookAlbumResource('albums')
    hookArtistResource('artists')
    hookLandingResource('landing')
    hookSearchResource('search')
    hookChartResource('landing3')
    hookRotorResource('rotor')
    const generation = hookGeneration
    const promise = Promise.all(hooksStarting)
        .then(() => {})
        .catch(error => {
            if (generation === hookGeneration) stopResourceHooks()
            throw error
        })
        .finally(() => {
            if (registration?.promise === promise) registration = undefined
        })
    registration = { generation, promise }
    return promise
}
export async function toggleLiteMode(enabled: boolean) {
    if (enabled) { stopResourceHooks(); unhookButtons(); }
    else { await hookResources(); prepareButtons(); }
    requestSdkSync()
}