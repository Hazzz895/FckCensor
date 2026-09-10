import { Album, Artist, OuterArtist, Release, RemoteList, RemoteSourceBase, Track, TrackReplacementStorageBase, TracksStorage } from "@/types";
import { debug, error, log, warn } from "@/utils/logger";
import addonConfig from '../../addon.config.mjs'
import { AnyARecord } from "node:dns";
import { versionSatisfies } from "@/utils/version-utils";
import Source from "./dto/sources/source";
import TrackReplacement from "./dto/track-replacement";
import { sources } from "./main-api";
import { LocalSource } from "./db-api";
import { ArtistInsertions } from "./dto/artist-insertion";
import { isBeta, isDev } from "@/dev/dev-utils";

const BASE_URI = "https://raw.githubusercontent.com/Hazzz895/FckCensorData/refs/heads/main/list_v2.json"
const OLD_BASE_URI = "https://raw.githubusercontent.com/Hazzz895/FckCensorData/refs/heads/main/list.json"
const LOCAL_URI = `http://localhost:2007/assets/list_v2.json?name=${addonConfig.id}` 

export let list: RemoteSource | null = null

export async function loadRemoteList() {
    RemoteSource.load(BASE_URI)
    RemoteSource.load(LOCAL_URI)

    const old_tracks: Record<string, string> = (await (await fetch(OLD_BASE_URI)).json())["tracks"]
    debug(old_tracks)
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
    })))
    debug(sources)
}

export function postProcessingInsertions(insertions: Record<string, ArtistInsertions>, tracks: Record<string, Track>, albums: Record<string, Album>) {
    for (const [i, entityRecord] of [tracks, albums].entries()) {
        const entityType = i === 0 ? "tracks" : "albums";
        for (const [id, t] of Object.entries(entityRecord) as [string, Track | Album][]) {
            if (!t.artists?.length) continue;

            const data = { 
                releaseId: id, 
                index: t.__fckCensor?.insertionIndex ?? undefined 
            };

            t.artists.forEach((a: Release) => {
                if (!a.id) return;
                if (!insertions[a.id]) insertions[a.id] = { tracks: [], albums: [] };
                if (!insertions[a.id][entityType]) insertions[a.id][entityType] = [];
                insertions[a.id][entityType]!.push(data)
            }); 
        }
    }
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

            postProcessingInsertions(this.artistsInsertions, this.tracks, this.albums)
        }
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
                //error("Failed list fetching: " + response.statusText + `(${response.status})`);
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

    private list
    private dbSource: LocalSource | null = null

    public constructor(list: MinifiedRemoteSource) {
        this.list = list;
    }

    private findDbSource() {
        if (this.dbSource) {
            return this.dbSource
        }
        return this.dbSource = sources.getSource(LocalSource)
    }

    async buildPlayerReplacement(trackId: string): Promise<TrackReplacement | null> {
        if (this.findDbSource()?.isRemoteException(trackId)) {
            return null;
        }
        for (const storage of this.list.tracksStorages) {
            let url = null
            if (storage.trackIds && storage.urlTemplate && Number(trackId) in storage.trackIds) {
                url = storage.urlTemplate.replace('%%', trackId);
            }
            else if (storage.tracks && trackId in storage.tracks) {
                const o = storage.tracks[trackId]
                if (typeof o === 'string') {
                    url = o
                }
                else {
                    url = o.url
                }
            }

            if (url) {
                return new TrackReplacement(this, url);
            }
        }
        return null;
    }

    hasPlayerReplacement(trackId: string): boolean {
        if (this.findDbSource()?.isRemoteException(trackId)) {
            return false;
        }
        for (const storage of this.list.tracksStorages) {
            if ((storage.tracks && trackId in storage.tracks) || (storage.trackIds && storage.urlTemplate && Number(trackId) in storage.trackIds)) {
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