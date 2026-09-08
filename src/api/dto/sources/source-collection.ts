import { Track, Album, OuterArtist, Artist, TrackMST, SpoofableEntity, Release } from '@/types'
import Source from './source'
import TrackReplacement from '../track-replacement'
import { debug, log } from '@/utils/logger';
import { isEmptyObject } from '@/utils/common';
import { LocalSource } from '@/api/db-api';
import { ArtistInsertions } from '../artist-insertion';

type Constructor<T> = new (...args: any[]) => T;

export default class SourceCollection implements Source {
    private sources: Source[] = []

    public getSource<T extends Source>(targetClass: Constructor<T>): T | null {
        for (const source of this.sources) {
            if (source instanceof targetClass) {
                return source;
            }
        }
        return null;
    }

    private prioritizeLocalSource() {
        const otherSources: Source[] = [];
        const localSources: Source[] = [];

        for (const source of this.sources) {
            if (source instanceof LocalSource) {
                localSources.push(source);
            } else {
                otherSources.push(source);
            }
        }

        this.sources = [...otherSources, ...localSources];
    }

    public getSources() { return this.sources }

    async buildPlayerReplacement(trackId: string): Promise<TrackReplacement | null> {
        debug("DOIDJIOD")
        for (const source of this.sources) {
            const result = await source.buildPlayerReplacement(trackId)
            if (result) {
                debug("RESULTT", result)
                return result;
            }
        }
        debug("FUCK")
        return null;
    }

    hasPlayerReplacement(trackId: string): boolean {
        for (const source of this.sources) {
            if (source.hasPlayerReplacement(trackId)) {
                debug("YES IT HAS!!!!!!!!!!!!!!")
                return true
            }
        }
        return false;
    }

    private internalSpoof(
        data: SpoofableEntity,
        getSpoofData: (id: string) => Record<string, any> | null | undefined,
        id: string,
        fillOriginalValues = true
    ): Record<string, any> | null | undefined {
        const spoofData = getSpoofData(id);

        if (!spoofData || isEmptyObject(spoofData)) {
            return null;
        }

        const rawData = data as Record<string, any>;

        if (isEmptyObject(spoofData)) {
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
            if (!(key in originalValues)) {
                originalValues[key] = rawData[key];
            }
        }

        Object.assign(data, spoofData);
        return spoofData;
    }

    getTrackSpoof(trackId: string): Track | null {
        const track = { } as Track
        this.sources.forEach(source => this.internalSpoof(track, source.getTrackSpoof.bind(source), trackId, false));

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

    spoofTrack(track: Track): Track {
        this.internalSpoof(track, this.getTrackSpoof.bind(this), String(track.id))

        track.albums?.forEach((album) => this.spoofAlbum(album))
        track.artists?.forEach((artist) => this.spoofArtist(artist))
        
        return track
    } 

    getAlbumSpoof(albumId: string): Album | null {
        const album = { } as Album
        this.sources.forEach(source => this.internalSpoof(album, source.getAlbumSpoof.bind(source), albumId, false))

        if (album && album.volumes) {
            album.trackCount = album.volumes.reduce((acc, v) => acc + v.length, 0);
            if (album.trackCount > 1) {
                album.type = "album";
            }
            else {
                album.type = "single";
            }
        }

        if (isEmptyObject(album)) {
            return null;
        }

        return album;
    }

    spoofAlbum(album: Album): Album {
        this.internalSpoof(album, this.getAlbumSpoof.bind(this), String(album.id)) as Album;

        return album
    }

    getArtistSpoof(artistId: string): Artist | null {
        const artist = { } as Artist
        this.sources.forEach(source => this.internalSpoof(artist, source.getArtistSpoof.bind(source), artistId, false))

        if (isEmptyObject(artist)) {
            return null;
        }

        return artist;
    }

    spoofArtist(artist: Artist): Artist {
        this.internalSpoof(artist, this.getArtistSpoof.bind(this), String(artist.id))

        return artist
    }

    getArtistInsertions(artistId: string): ArtistInsertions | null {
        const localInsertions: ArtistInsertions = { tracks: [], albums: [] };
        let has = false;

        for (const source of this.sources) {
            if (source instanceof LocalSource) {
                const data = source.getArtistInsertions(artistId);
                if (data) {
                    localInsertions.tracks.push(...data.tracks);
                    localInsertions.albums.push(...data.albums);
                    has = true;
                }
            }
        }

        debug("HASLOCAL", has)

        if (has) {
            debug("RETURN LOCAL DATA", localInsertions)
            return localInsertions;
        }

        const otherInsertions: ArtistInsertions = { tracks: [], albums: [] };

        for (const source of this.sources) {
            if (!(source instanceof LocalSource)) {
                const data = source.getArtistInsertions(artistId);
                if (data) {
                    otherInsertions.tracks.push(...data.tracks);
                    otherInsertions.albums.push(...data.albums);
                    has = true;
                }
            }
        }

        debug("RETURN OTHER DATA", has ? otherInsertions : null)
        return has ? otherInsertions : null;
    }

    spoofAnyArtist(artist: Artist | OuterArtist): Artist | OuterArtist {
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
                a.counts.tracks += insertions.tracks.length;
            }
            if (a.counts?.directAlbums) {
                a.counts.directAlbums += insertions.albums.length;
            }
        }
        
        this.spoofArtist(a);
        return artist;
    }

    pushSource(source: Source) {
        this.sources.push(source)
        this.prioritizeLocalSource();
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
        const i = this.getArtistInsertions(artistId);
        debug(i)
        return !isEmptyObject(i)
    }
}