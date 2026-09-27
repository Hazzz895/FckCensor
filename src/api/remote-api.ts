import { Album, Artist, Release, RemoteList, RemoteSourceBase, Track, TracksStorage } from "@/types";
import { debug, error, log, warn } from "@/utils/logger";
import { versionSatisfies } from "@/utils/version-utils";
import addonConfig from '../../addon.config.mjs';
import { ArtistInsertions } from "./dto/artist-insertion";
import Source from "./dto/sources/source";
import TrackReplacement from "./dto/track-replacement";
import { postProcessing, sources } from "./main-api";
import { ADDON_FAQ_URI, DATA_LIST_URI } from "@/hooks/ui/constants";
import { showNotificationSafe } from "@/utils/ui-utils";

const LOCAL_URI = `http://localhost:2007/assets/list_v2.json?name=${addonConfig.id}` 

export let list: RemoteSource | null = null

export async function loadRemoteList() {
    RemoteSource.load(DATA_LIST_URI)
    //RemoteSource.load(LOCAL_URI)

    /*const old_tracks: Record<string, string> = (await (await fetch(DATA_LIST_V1_URI)).json())["tracks"]
    sources.pushSource(new RemoteSource(new MinifiedRemoteSource({
        sources: [
            {
                tracksStorages: [
                    {
                        tracks: old_tracks,
                    }
                ],
            }
        ]
    })))*/
}

export class MinifiedRemoteSource implements RemoteSourceBase {
    public constructor(list: RemoteList) {
        for (const source of list.sources) {
            if (source.supported_version && !versionSatisfies(addonConfig.version, source.supported_version)) continue;
            
            this.tracks = { ...source.tracks, ...this.tracks };
            this.albums = { ...source.albums, ...this.albums };
            this.artists = { ...source.artists, ...this.artists };
            this.artistsInsertions = { ...source.artistsInsertions, ...this.artistsInsertions };

            if (source.tracksStorages) {
                this.tracksStorages = [ ...source.tracksStorages, ...this.tracksStorages ];
            }

            for (const storage of source.tracksStorages ?? []) {
                const resolveUrl = (rawUrl: string | number): string | number => {
                    return (typeof rawUrl === "number" || (typeof rawUrl === "string" && !rawUrl.includes("://"))) && storage.urlTemplate 
                        ? storage.urlTemplate.replace("%%", String(rawUrl)) 
                        : rawUrl;
                };

                if (storage.trackIds) {
                    for (const item of storage.trackIds) {
                        const trackId = String(typeof item === "number" ? item : item.id);
                        const durationMs = typeof item === "number" ? undefined : item.durationMs;

                        if (durationMs !== undefined) {
                            this.tracks[trackId] = { ...this.tracks[trackId], durationMs };
                        }
                    }
                }

                if (storage.tracks) {
                    for (const [trackId, replacement] of Object.entries(storage.tracks)) {
                        let durationMs: number | undefined;

                        if (typeof replacement === "object" && replacement !== null) {
                            storage.tracks[trackId] = {
                                ...replacement,
                                url: resolveUrl(replacement.url)
                            };
                            durationMs = replacement.durationMs;
                        } else {
                            storage.tracks[trackId] = resolveUrl(replacement);
                        }

                        if (durationMs !== undefined) {
                            this.tracks[trackId] = { ...this.tracks[trackId], durationMs };
                        }
                    }
                }
            }
        }

        postProcessing(this.artistsInsertions, this.tracks, this.albums);
    }

    tracks: Record<string, Track> = {};
    albums: Record<string, Album> = {};
    artists: Record<string, Artist> = {};
    artistsInsertions: Record<string, ArtistInsertions> = {};
    tracksStorages: TracksStorage[] = [];
}

export class RemoteSource implements Source {
    public static async load(url: string) {
        try {
            if (list) {
                return list;
            }
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error("Fetch failed with status " + response.status + ": " + response.statusText);
            }
            const json = await response.json();
            if (json) {
                list = new RemoteSource(new MinifiedRemoteSource(json));
                sources.pushSource(list)
                log("Loaded remote list")
            }
            else {
                error("Failed to load remote list")
            }
        }
        catch (e) {
            error("Error loading remote list", e)
            if (url === DATA_LIST_URI) {
                showNotificationSafe("Не удалось загрузить список автоматических подмен. Применяются только пользовательские подмены. Включите VPN или Zapret.", "error", {
                    link: {
                        label: "[ Подробнее ]",
                        href: ADDON_FAQ_URI + "#%D0%BD%D0%B5-%D1%80%D0%B0%D0%B1%D0%BE%D1%82%D0%B0%D0%B5%D1%82-%D0%B0%D0%B2%D1%82%D0%BE%D0%BC%D0%B0%D1%82%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B0%D1%8F-%D0%BF%D0%BE%D0%B4%D0%BC%D0%B5%D0%BD%D0%B0--%D0%BF%D0%BE%D0%B4%D0%BC%D0%B5%D0%BD%D1%91%D0%BD%D0%BD%D1%8B%D0%B9-%D1%82%D1%80%D0%B5%D0%BA-%D0%BD%D0%B5-%D0%B2%D0%BE%D1%81%D0%BF%D1%80%D0%BE%D0%B8%D0%B7%D0%B2%D0%BE%D0%B4%D0%B8%D1%82%D1%81%D1%8F",
                    },
                    durationMs: 6e4
                })
            }
            return null;
        }
        return list;
    }

    private list: MinifiedRemoteSource

    public constructor(list: MinifiedRemoteSource) {
        this.list = list;
    }

    async buildPlayerReplacement(trackId: string): Promise<TrackReplacement | null> {
        for (const storage of this.list.tracksStorages) {
            let url = null
            if (storage.tracks && trackId in storage.tracks) {
                let o = storage.tracks[trackId]
                if (typeof o === 'object') {
                    o = o.url;
                }
                
                if (typeof o === 'string') {
                    url = o
                }
                else if (typeof o === 'number') {
                    url = storage.urlTemplate?.replace('%%', String(o));
                }
            }
            else if (storage.trackIds && storage.urlTemplate && storage.trackIds.find(x => typeof x === "number" ? String(x) == trackId : String(x.id) == trackId)) {
                url = storage.urlTemplate.replace('%%', trackId);
            }

            if (url) {
                return new TrackReplacement(this, url);
            }
        }
        return null;
    }

    hasPlayerReplacement(trackId: string): boolean | null {
        for (const storage of this.list.tracksStorages) {
            if ((storage.tracks && trackId in storage.tracks) || (storage.trackIds && storage.urlTemplate && storage.trackIds.find(x => typeof x === "number" ? String(x) == trackId : String(x.id) == trackId))) {
                return true;
            }
        }
        return null;
    }

    getTrackSpoof(trackId: string): Track | null {
        return this.list.tracks[trackId] ?? null;
    }

    getAlbumSpoof(albumId: string): Album | null {
        return this.list.albums[albumId] ?? null;
    }

    getArtistSpoof(artistId: string): Artist | null {
        return this.list.artists[artistId] ?? null;
    }

    getArtistInsertions(artistId: string): ArtistInsertions | null {
        return this.list.artistsInsertions[artistId] ?? null;
    }
}