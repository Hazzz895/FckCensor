import { Album, Artist, Release, RemoteList, RemoteSourceBase, Track, TracksStorage } from "@/types";
import { debug, error, log, warn } from "@/utils/logger";
import { versionSatisfies } from "@/utils/version-utils";
import addonConfig from '../../addon.config.mjs';
import { ArtistInsertions } from "./dto/artist-insertion";
import Source from "./dto/sources/source";
import TrackReplacement from "./dto/track-replacement";
import { postProcessing, sources } from "./main-api";
import { ADDON_FAQ_URI } from "@/hooks/ui/constants";

const BASE_URI = "https://raw.githubusercontent.com/Hazzz895/FckCensorData/refs/heads/main/list_v2.json"
const OLD_BASE_URI = "https://raw.githubusercontent.com/Hazzz895/FckCensorData/refs/heads/main/list.json"
const LOCAL_URI = `http://localhost:2007/assets/list_v2.json?name=${addonConfig.id}` 

export let list: RemoteSource | null = null

export async function loadRemoteList() {
    RemoteSource.load(BASE_URI)
    //RemoteSource.load(LOCAL_URI)

    /*const old_tracks: Record<string, string> = (await (await fetch(OLD_BASE_URI)).json())["tracks"]
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
            
            this.tracks = { ...source.tracks, ...this.tracks};
            this.albums = { ...source.albums, ...this.albums};
            this.artists = { ...source.artists, ...this.artists }
            this.artistsInsertions = { ...source.artistsInsertions, ...this.artistsInsertions };
            if (source.tracksStorages) {
                this.tracksStorages = [ ...source.tracksStorages, ...this.tracksStorages ]
            }

            for (const storage of this.tracksStorages) {
                const replacements = storage.trackIds ?? (storage.tracks ? Object.entries(storage.tracks) : []);
                for (const replacement of replacements) {
                    let trackId: string;
                    let durationMs: number | undefined;

                    if (Array.isArray(replacement)) {
                        trackId = replacement[0];
                        durationMs = typeof replacement[1] === "string" ? undefined : replacement[1].durationMs;
                    }
                    else {
                        trackId = String(typeof replacement === "number" ? replacement : replacement.id);
                        durationMs = typeof replacement === "number" ? undefined : replacement.durationMs;
                    }

                    if (durationMs === undefined) continue;
                    this.tracks[trackId] = { ...this.tracks[trackId], durationMs };
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
                if (url === BASE_URI) {
                    error("Failed list fetching: " + response.statusText + `(${response.status})`);
                    window.pulsesyncApi?.showNotification?.("Не удалось загрузить список автоматических подмен. Применяются только пользовательские подмены.", "error", {
                        link: {
                            label: "Нажмите, чтобы исправить",
                            href: ADDON_FAQ_URI + "#%D0%BD%D0%B5-%D1%80%D0%B0%D0%B1%D0%BE%D1%82%D0%B0%D0%B5%D1%82-%D0%B0%D0%B2%D1%82%D0%BE%D0%BC%D0%B0%D1%82%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B0%D1%8F-%D0%BF%D0%BE%D0%B4%D0%BC%D0%B5%D0%BD%D0%B0--%D0%BF%D0%BE%D0%B4%D0%BC%D0%B5%D0%BD%D1%91%D0%BD%D0%BD%D1%8B%D0%B9-%D1%82%D1%80%D0%B5%D0%BA-%D0%BD%D0%B5-%D0%B2%D0%BE%D1%81%D0%BF%D1%80%D0%BE%D0%B8%D0%B7%D0%B2%D0%BE%D0%B4%D0%B8%D1%82%D1%81%D1%8F",
                        },
                        durationMs: 6e4
                    })
                }
                return null;
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
                const o = storage.tracks[trackId]
                if (typeof o === 'string') {
                    url = o
                }
                else {
                    url = o.url
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

    hasPlayerReplacement(trackId: string): boolean {
        for (const storage of this.list.tracksStorages) {
            if ((storage.tracks && trackId in storage.tracks) || (storage.trackIds && storage.urlTemplate && storage.trackIds.find(x => typeof x === "number" ? String(x) == trackId : String(x.id) == trackId))) {
                return true;
            }
        }
        return false;
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