import { Track, Album, OuterArtist, Artist, TrackMST, SpoofableEntity } from '@/types'
import Source from './source'
import TrackReplacement from '../track-replacement'
import { debug, log } from '@/utils/logger';
import { isEmptyObject } from '@/utils/common';
import { LocalSource } from '@/api/db-api';

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

    public getSources() { return this.sources }

    async buildPlayerReplacement(trackId: string): Promise<TrackReplacement | null> {
        for (const source of this.sources) {
            const result = await source.buildPlayerReplacement(trackId)
            if (result) {
                return result;
            }
        }
        return null;
    }

    hasPlayerReplacement(trackId: string): boolean {
        for (const source of this.sources) {
            if (source.hasPlayerReplacement(trackId)) {
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
    ): void {
        const spoofData = getSpoofData(id);

        if (!spoofData || isEmptyObject(spoofData)) {
            return;
        }

        const rawData = data as Record<string, any>;

        if (isEmptyObject(spoofData)) {
            return;
        }

        if (!fillOriginalValues) {
            Object.assign(data, spoofData);
            return;
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
    }

    getTrackSpoof(trackId: string): Track | null {
        const track = { } as Track
        this.sources.forEach(source => this.internalSpoof(track, source.getTrackSpoof.bind(source), trackId, false));

        if (this.hasPlayerReplacement(trackId)) {
            track.error = undefined;
            track.available = true;
        }

        return track
    }

    spoofTrack(track: Track): Track {
        this.internalSpoof(track, this.getTrackSpoof.bind(this), String(track.id))

        if (track.coverUri && !track.ogImage) {
            track.ogImage = track.coverUri;
        }

        track.albums?.forEach((album) => this.spoofAlbum(album))
        track.artists?.forEach((artist) => this.spoofArtist(artist))
        return track
    } 

    getAlbumSpoof(albumId: string): Album | null {
        const album = { } as Album
        this.sources.forEach(source => this.internalSpoof(album, source.getAlbumSpoof.bind(source), albumId, false))
        return album;
    }

    spoofAlbum(album: Album): Album {
        this.internalSpoof(album, this.getAlbumSpoof.bind(this), String(album.id))

        album.artists?.forEach((artist) => this.spoofArtist(artist))

        return album
    }

    getArtistSpoof(artistId: string): Artist | null {
        const artist = { } as Artist
        this.sources.forEach(source => this.internalSpoof(artist, source.getArtistSpoof.bind(source), artistId, false))
        debug(artistId, artist, this.getSource(LocalSource)?.getArtistSpoof(artistId))
        return artist;
    }

    spoofArtist(artist: Artist): Artist {
        this.internalSpoof(artist, this.getArtistSpoof.bind(this), String(artist.id))

        return artist
    }

    spoofAnyArtist(artist: Artist | OuterArtist): Artist | OuterArtist {
        let a: Artist;
        if ("artist" in artist) { // artist instanceof OuterArtist
            a = artist.artist;
        }
        else {
            a = artist;
        }

        this.spoofArtist(a);
        return artist;
    }

    pushSource(source: Source) {
        this.sources.push(source)
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
}