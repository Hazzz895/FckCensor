import { localSource } from '@/api/db-api'
import type { Artist, Skeleton } from '@/types'
import { isCustomEntity } from './custom-entity-id-counter'

export const isCustomArtistId = (id: unknown) => isCustomEntity(Number(id))

export const normalizeArtistName = (name?: string) => (name ?? '').trim().replace(/\s+/g, ' ').toLowerCase()

export const isStoredLocalArtist = (id: unknown) => isCustomArtistId(id) && localSource.artistSpoofs.has(String(id))

export function getLocalArtists(): Artist[] {
    const result: Artist[] = []
    for (const [id, spoof] of localSource.artistSpoofs) {
        if (isCustomArtistId(id) && spoof?.name) result.push({ ...spoof, id })
    }
    return result
}

export function findLocalArtistByName(name: string): Artist | null {
    const key = normalizeArtistName(name)
    if (!key) return null
    return getLocalArtists().find(artist => normalizeArtistName(artist.name) === key) ?? null
}

export async function storeNewLocalArtist(artist: Artist): Promise<void> {
    const id = String(artist.id)
    if (!isCustomArtistId(id) || localSource.artistSpoofs.has(id)) return
    await localSource.pushArtistSpoof({ id, name: artist.name } as Artist, id)
}

export function createArtistSkeleton(artistId: string): Skeleton {
    return {
        "id": "artist_web",
        "title": "Артист",
        "blocks": [
            {
                "id": "TABS_BLOCK",
                "type": "TABS",
                "data": {
                    "tabs": [
                        {
                            "id": "artist_web",
                            "title": "Артист",
                            "blocks": [
                            {
                                "id": "artist_popular_tracks_and_releases",
                                "type": "ARTIST_POPULAR_TRACKS_AND_RELEASES",
                                "data": {
                                "blocks": [
                                    {
                                    "id": "artist_popular_tracks",
                                    "type": "ARTIST_POPULAR_TRACKS",
                                    "data": {
                                        "title": "Популярные треки",
                                        "showPolicy": "SHOW_AND_LOAD",
                                        "viewAllAction": {
                                        "deeplink": `yandexmusic://artist/${artistId}/all/tracks`,
                                        "weblink": `/artist/${artistId}/tracks`
                                        },
                                        "source": {
                                        "uri": `/artists/${artistId}/tracks`,
                                        "countWeb": 0,
                                        "count": 0
                                        }
                                    }
                                    }
                                ]
                                }
                            },
                            {
                                "id": "artist_albums",
                                "type": "ARTIST_ALBUMS",
                                "data": {
                                "title": "Популярные альбомы",
                                "showPolicy": "SHOW_AND_LOAD",
                                "viewAllAction": {
                                    "deeplink": `yandexmusic://artist/${artistId}/all/albums`,
                                    "weblink": `/artist/${artistId}/albums`
                                },
                                "source": {
                                    "uri": `/artists/${artistId}/blocks/artist-albums`,
                                    "countWeb": 0,
                                    "count": 0
                                }
                                }
                            }
                            ]
                        }
                    ],
                    "selectedTabIndex": 0
                }
            }
        ]
    }
}

export function createArtistPager(request: { page?: unknown; pageSize?: unknown; per?: unknown; } | undefined, total: number) {
    const page = Number(request?.page);
    const per = Number(request?.pageSize ?? request?.per);
    return {
        page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 0,
        per: Number.isFinite(per) && per > 0 ? Math.floor(per) : total,
        total,
    };
}

export function createArtistLandingBlock(type: unknown, request: { page?: unknown; pageSize?: unknown; per?: unknown; } | undefined) {
    if (type === 'ARTIST_POPULAR_TRACKS') {
        return {
            tracks: [] as unknown[],
            pager: createArtistPager(request, 0),
        };
    }
    if (type === 'ARTIST_ALBUMS') {
        return { items: [] as unknown[] };
    }
    return {};
}

export type ArtistLandingBlockType = 'ARTIST_POPULAR_TRACKS' | 'ARTIST_ALBUMS';

