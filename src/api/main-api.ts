import { loadRemoteList } from "./remote-api";
import { getDb, loadLocalDb } from "./db-api";

import { Track, Album, OuterArtist, Artist, TrackMST, SpoofableEntity, Release, FckCensorSpoofData, SpoofableType } from '@/types'
import { debug, log } from '@/utils/logger';
import { isEmptyObject } from '@/utils/common';
import { LocalSource } from '@/api/db-api';
import { ArtistInsertions } from "./dto/artist-insertion";
import Source from "./dto/sources/source";
import TrackReplacement from "./dto/track-replacement";
import { putToBundle } from "@/dev/dev-utils";
import { RKN_BLOCKED_DISCLAIMER_ID } from "@/hooks/ui/constants";

type Constructor<T> = new (...args: any[]) => T;

let loaded = false
export async function loadSources() {
    if (loaded) return Promise.resolve();
    
    await Promise.all([loadRemoteList(), loadLocalDb()])
        .then(() => {
            loaded = true;
        });
}

export class SourcesCollection {
    private localSources: LocalSource[] = [];
    private nonLocalSources: Source[] = [];

    public get sources(): Source[] { return [...this.localSources, ...this.nonLocalSources] }

    public push(source: Source) {
        if (source instanceof LocalSource) {
            this.localSources.push(source);
        } else {
            this.nonLocalSources.push(source);
        }
    }

    public getSource<T extends Source>(targetClass: Constructor<T>): T | null {
        for (const source of this.sources) {
            if (source instanceof targetClass) {
                return source;
            }
        }
        return null;
    }

    public reduce<T>(
        initial: T,
        callback: (acc: T, source: Source) => T,
        matches: (acc: T) => boolean
    ): T {
        let acc = initial;

        for (const source of this.localSources) {
            acc = callback(acc, source);
        }

        if (matches(acc)) {
            return acc;
        }

        for (const source of this.nonLocalSources) {
            acc = callback(acc, source);
        }
        return acc;
    }

    public reduceSpoof<T extends object>(
        initial: T,
        getSpoof: (source: Source) => T | null | undefined
    ): T {
        const acc = initial;

        let foundLocal = false;
        for (const source of this.localSources) {
            const data = getSpoof(source);
            if (data != null) {
                Object.assign(acc, data);
                foundLocal = true;
            }
        }

        if (foundLocal) {
            return acc;
        }

        for (const source of this.nonLocalSources) {
            const data = getSpoof(source);
            if (data != null) {
                Object.assign(acc, data);
            }
        }

        return acc;
    }

    public first<T>(
        callback: (source: Source) => T | null | undefined,
        matches: (value: T) => boolean = (value) => !!value
    ): T | null {
        function walk(sources: Source[]): T | null {
            for (const source of sources) {
                const result = callback(source);
                if (result != null && matches(result)) {
                    return result;
                }
            }
            return null;
        };

        const localResult = walk(this.localSources);
        if (localResult !== null) {
            return localResult;
        }
        return walk(this.nonLocalSources);
    }

    public async firstAsync<T>(
        callback: (source: Source) => Promise<T | null | undefined>,
        matches: (value: T) => boolean = (value) => !!value
    ): Promise<T | null> {
        async function walk(sources: Source[]): Promise<T | null> {
            for (const source of sources) {
                const result = await callback(source);
                if (result != null && matches(result)) {
                    return result;
                }
            }
            return null;
        };

        const localResult = await walk(this.localSources);
        if (localResult !== null) {
            return localResult;
        }
        return walk(this.nonLocalSources);
    }
}

export function postProcessing(insertions: Record<string, ArtistInsertions>, tracks: Record<string, Track>, albums: Record<string, Album>) {
    for (const [i, entityRecord] of [tracks, albums].entries()) {
        const entityType = i === 0 ? "tracks" : "albums";
        for (const [id, entity] of Object.entries(entityRecord) as [string, Track | Album][]) {
            if (entity.artists?.length && entity.__fckCensor?.insertionIndex !== null) {
                const data = { 
                    releaseId: id, 
                    index: entity.__fckCensor?.insertionIndex ?? undefined 
                };

                entity.artists.forEach((a: Release) => {
                    if (!a.id) return;
                    if (!insertions[a.id]) insertions[a.id] = { tracks: [], albums: [] };
                    if (!insertions[a.id][entityType]) insertions[a.id][entityType] = [];
                    insertions[a.id][entityType]!.push(data)
                }); 
            }

            if (entityType === "albums" && "volumes" in entity && entity.volumes && entity.coverUri) {
                entity.volumes.forEach(v => v.forEach(t => {
                    let trackSpoof = tracks[t.id];
                    if (!trackSpoof) {
                        return; // обложка из альбома подтягивается только для треков которые имеют спуф чтобы не подменивать обложки для треков которые уже были в альбоме
                    }
                    
                    if (!("coverUri" in trackSpoof)) {
                        trackSpoof.coverUri = entity.coverUri;
                    }
                }))
            }
        }
    }
}

export default class MainSource implements Source {
    private sourcesCollection = new SourcesCollection();

    private fckCensorData: Map<string, FckCensorSpoofData> = new Map();

    private static fckCensorKey(type: SpoofableType, id: string): string {
        return `${type}:${id}`;
    }

    private rememberFckCensorData(type: SpoofableType, id: string, data: FckCensorSpoofData) {
        this.fckCensorData.set(MainSource.fckCensorKey(type, id), data);
    }

    public getFckCensorData(type: SpoofableType, id: string): FckCensorSpoofData | null {
        return this.fckCensorData.get(MainSource.fckCensorKey(type, id)) ?? null;
    }

    public forgetFckCensorData(type: SpoofableType, id: string) {
        this.fckCensorData.delete(MainSource.fckCensorKey(type, id));
    }

    public getSourcesCollection() { return this.sourcesCollection }

    getSource<T extends Source>(targetClass: Constructor<T>): T | null {
        return this.sourcesCollection.getSource(targetClass);
    }

    async buildPlayerReplacement(trackId: string): Promise<TrackReplacement | null> {
        return this.sourcesCollection.firstAsync(
            source => source.buildPlayerReplacement(trackId)
        );
    }

    hasPlayerReplacement(trackId: string): boolean {
        return this.sourcesCollection.first(source => source.hasPlayerReplacement(trackId)) ?? false;
    }

    private internalSpoof<T extends SpoofableEntity>(
        data: T,
        getSpoofData: (id: string) => T | null | undefined,
        id: string,
        fillOriginalValues = true,
        type?: SpoofableType
    ): T | null {
        const spoofData = getSpoofData(id);

        if (!spoofData || isEmptyObject(spoofData)) {
            return null;
        }

        if (!fillOriginalValues) {
            Object.assign(data, spoofData);
            return spoofData;
        }

        if (!data.__fckCensor) {
            data.__fckCensor = {};
        }

        if (!data.__fckCensor.originalValues) {
            data.__fckCensor.originalValues = {};
        }

        const originalValues = data.__fckCensor.originalValues;
        for (const key of Object.keys(spoofData)) {
            if (key === "__fckCensor") continue;
            if (!(key in originalValues)) {
                originalValues[key] = (data as Record<string, any>)[key];
            }
        }

        const { __fckCensor: spoofMeta, ...spoofContent } = spoofData as T;
        Object.assign(data, spoofContent);

        if (spoofMeta) {
            Object.assign(data.__fckCensor, spoofMeta);
        }

        if (type) {
            this.rememberFckCensorData(type, id, data.__fckCensor);
        }

        return spoofData;
    }

    getTrackSpoof(trackId: string): Track | null {
        const track = this.sourcesCollection.reduceSpoof<Track>(
            {} as Track,
            (source) => source.getTrackSpoof(trackId)
        );

        if (this.hasPlayerReplacement(trackId)) {
            track.error = undefined;
            track.available = true;
        }

        if (track.coverUri && !track.ogImage) {
            track.ogImage = track.coverUri;
        }

        if (isEmptyObject(track)) {
            return null;
        }

        return track
    }

    spoofTrack(track: Track): Track | null {
        const spoof = this.internalSpoof(track, this.getTrackSpoof.bind(this), String(track.id), true, "track") as Track

        let spoofedAlbum = false;
        track.albums?.forEach((album) => {
            if (!isEmptyObject(this.spoofAlbum(album)) && !spoofedAlbum) {
                spoofedAlbum = true;
            }
        })
        track.artists?.forEach(this.spoofArtist.bind(this));
        
        if (spoofedAlbum && track.albums) {
            for (const a of track.albums) {
                const uri = a.cover?.uri || a.coverUri || a.ogImage;
                if (spoof?.coverUri === undefined && spoof?.ogImage === undefined && uri) {
                    track.coverUri = track.ogImage = uri;
                }
                if (spoof?.artists === undefined && a.artists) {
                    if (a.__fckCensor?.replaceArtistsInAlbumVolumes) {
                        track.artists = a.artists;
                    }
                }
            }
        }

        if (!isEmptyObject(spoof) && track.available) {
            track.disclaimers = track.disclaimers?.filter(d => !d.includes(RKN_BLOCKED_DISCLAIMER_ID));
        }

        return spoof
    } 

    getAlbumSpoof(albumId: string): Album | null {
        const album = this.sourcesCollection.reduceSpoof<Album>(
            {} as Album,
            (source) => source.getAlbumSpoof(albumId)
        );

        if (album.volumes) {
            album.trackCount = album.volumes.reduce((acc, v) => acc + v.length, 0);
            if (album.trackCount > 1) {
                album.type = "album";
            }
            else {
                album.type = "single";
            }
        }

        if (album.coverUri) {
            if (!album.ogImage) {
                album.ogImage = album.coverUri;
            }
            if (!album.cover) {
                album.cover = {
                    "uri": album.coverUri
                }
            }
        }

        if (album.year === undefined && album.releaseDate) {
            album.year = new Date(album.releaseDate).getFullYear();
        }
        else if (album.releaseDate === undefined && album.year) {
            album.releaseDate = new Date(album.year, 0, 1, 11).toJSON();
        }

        if (isEmptyObject(album)) {
            return null;
        }

        return album;
    }

    spoofAlbum(album: Album): Album | null {
        const albumSpoof = this.internalSpoof(album, this.getAlbumSpoof.bind(this), String(album.id), true, "album");

        if (album.volumes?.length == 1 && album.volumes[0].length == 1) {
            const track = album.volumes[0][0];
            const trackSpoof = this.getTrackSpoof(track.id);
            if (trackSpoof) {
                const keys = ['coverUri', 'title', 'artists'];

                keys.forEach(key => {
                    if (key in trackSpoof) {
                        (album as any)[key] = (trackSpoof as any)[key];
                    }
                });
            }
        }

        return albumSpoof;
    }

    getArtistSpoof(artistId: string): Artist | null {
        const artist = this.sourcesCollection.reduceSpoof<Artist>(
            {} as Artist,
            (source) => source.getArtistSpoof(artistId)
        );

        if (isEmptyObject(artist)) {
            return null;
        }

        return artist;
    }

    spoofArtist(artist: Artist): Artist | null {
        return this.internalSpoof(artist, this.getArtistSpoof.bind(this), String(artist.id), true, "artist")
    }

    getArtistInsertions(artistId: string): ArtistInsertions | null {
        const insertions = this.sourcesCollection.reduce<Required<ArtistInsertions>>(
            { tracks: [], albums: [] },
            (acc, source) => {
                const data = source.getArtistInsertions(artistId);
                if (data) {
                    if (data.tracks) {
                        acc.tracks.push(...data.tracks);
                    }
                    if (data.albums) {
                        acc.albums.push(...data.albums);
                    }
                }
                return acc;
            },
            (acc) => acc.tracks.length > 0 || acc.albums.length > 0
        );

        if (insertions.tracks.length === 0 && insertions.albums.length === 0) {
            return null;
        }

        return insertions;
    }

    spoofAnyArtist(artist: Artist | OuterArtist): Artist | null {
        let a: Artist;
        if ("artist" in artist) { // artist instanceof OuterArtist
            a = artist.artist;
        }
        else {
            a = artist;
        }

        const insertions = this.getArtistInsertions(a.id);
        if (insertions) {
            if (a.counts?.tracks) {
                a.counts.tracks += insertions.tracks?.length ?? 0;
            }
            if (a.counts?.directAlbums) {
                a.counts.directAlbums += insertions.albums?.length ?? 0;
            }
        }
        
        return this.spoofArtist(a);
    }

    pushSource(source: Source) {
        this.sourcesCollection.push(source)
    }

    hasTrackSpoof(trackId: string): boolean {
        return !isEmptyObject(this.getTrackSpoof(trackId))
    }

    hasAlbumSpoof(albumId: string): boolean {
        return !isEmptyObject(this.getAlbumSpoof(albumId))
    }

    hasArtistSpoof(artistId: string): boolean {
        return !isEmptyObject(this.getArtistSpoof(artistId))
    }

    hasInsertions(artistId: string): boolean {
        return !isEmptyObject(this.getArtistInsertions(artistId));
    }
}

export const sources = new MainSource();
putToBundle("sources", sources);