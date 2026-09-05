import { Album, Artist, OuterArtist, RemoteList, RemoteSourceBase, Track, TracksStorage } from "@/types";
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
                tracks_storages: [
                    {
                        tracks: old_tracks,
                    }
                ],
                supported_version: ">0.0.0",
                albums: {},
                tracks: {},
                artists: {}
            }
        ]
    })))
    debug(sources)
}

export class MinifiedRemoteSource implements RemoteSourceBase {
    public constructor(list: RemoteList) {
        for (const source of list.sources) {
            if (!source.supported_version || !versionSatisfies(addonConfig.version, source.supported_version)) continue;
            
            this.tracks = { ...source.tracks, ...this.tracks};
            this.albums = { ...source.albums, ...this.albums};
            this.artists = { ...source.artists, ...this.artists }
            this.tracks_storages = [ ...source.tracks_storages, ...this.tracks_storages ]
        }
    }

    tracks: Record<string, Track> = {};
    albums: Record<string, Album> = {};
    artists: Record<string, Artist> = {};
    tracks_storages: TracksStorage[] = [];
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
        for (const storage of this.list.tracks_storages) {
            let url = null
            if (storage.track_ids && storage.url_template && Number(trackId) in storage.track_ids) {
                url = storage.url_template.replace('%%', trackId);
            }
            else if (storage.tracks && trackId in storage.tracks) {
                url = storage.tracks[trackId]
            }
            debug(this, url)
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
        for (const storage of this.list.tracks_storages) {
            if ((storage.tracks && trackId in storage.tracks) || (storage.track_ids && storage.url_template && Number(trackId) in storage.track_ids)) {
                return true;
            }
        }
        return false;
    }

    getTrackSpoof(trackId: string): Track | null {
        if (trackId in this.list.tracks) {
            return this.list.tracks[trackId]
        }
        return null;
    }

    getAlbumSpoof(albumId: string): Album | null {
        if (albumId in this.list.albums) {
            return this.list.albums[albumId]
        }
        return null;
    }

    getArtistSpoof(artistId: string): Artist | null {
        if (artistId in this.list.artists) {
            return this.list.artists[artistId];
        }
        return null;
    }

    getArtistInsertions(artistId: string): ArtistInsertions | null {
        throw new Error("Method not implemented.");
    }
}