import { debug, log } from "@/utils/logger";
import Source from "./dto/sources/source";
import { Track, Album, Artist } from "@/types";
import TrackReplacement from "./dto/track-replacement";
import { list, postProcessingInsertions } from "./remote-api";
import { sources } from "./main-api";
import { getTrackAvaiableSpoof, reloadPlayer } from "@/utils/music";
import { ArtistInsertions } from "./dto/artist-insertion";

let dbPromise: Promise<IDBDatabase> | null = null;

const TRACKS = "tracks"
const REMOTE_EXCEPTIONS = "remote_exceptions"
const REPORTED_TRACKS = "reported_tracks"
const TRACK_SPOOFS = "track_spoofs"
const ALBUM_SPOOFS = "album_spoofs"
const ARTIST_SPOOFS = "artists_spoofs"
const ARTIST_INSERTIONS = "artists_insertions"

export function getDb(): Promise<IDBDatabase> {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open("FckCensor" + "Data", 5);

            request.onupgradeneeded = (event) => {
                if (!event.target) return;
                const db = (event.target as IDBOpenDBRequest).result;

                if (event.oldVersion < 5 ) { // < 2.0.0
                    if (db.objectStoreNames.contains(REMOTE_EXCEPTIONS)) {
                        db.deleteObjectStore(REMOTE_EXCEPTIONS);
                    }

                    if (db.objectStoreNames.contains(REPORTED_TRACKS)) { // TODO: migrate
                        // ...
                    }
                }

                const key = { keyPath: "id" };
                function createIfNotExist(...tables: string[]) {
                    for (const table of tables) {
                        if (!db.objectStoreNames.contains(table)) {
                            db.createObjectStore(table, key);
                        }
                    }
                }

                createIfNotExist(
                    TRACKS,
                    REPORTED_TRACKS,
                    TRACK_SPOOFS,
                    ALBUM_SPOOFS,
                    ARTIST_SPOOFS,
                    ARTIST_INSERTIONS
                );
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    return dbPromise;
}

export async function loadLocalDb() {
    try {
        const db = await getDb();
        const tx = db.transaction(
            [TRACKS, TRACK_SPOOFS, ALBUM_SPOOFS, ARTIST_SPOOFS, ARTIST_INSERTIONS],
            "readonly"
        );

        const tracksStore = tx.objectStore(TRACKS);
        const trackSpoofsStore = tx.objectStore(TRACK_SPOOFS);
        const albumSpoofsStore = tx.objectStore(ALBUM_SPOOFS);
        const artistSpoofsStore = tx.objectStore(ARTIST_SPOOFS);
        const artistInsertionsStore = tx.objectStore(ARTIST_INSERTIONS);

        const tracksReq = tracksStore.getAllKeys();
        const trackSpoofsReq = trackSpoofsStore.getAll();
        const albumSpoofsReq = albumSpoofsStore.getAll();
        const artistSpoofsReq = artistSpoofsStore.getAll();
        const artistInsertionsReq = artistInsertionsStore.getAll();

        await new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });

        localSource.replacementsTrackIds = tracksReq.result.map(String);

        localSource.trackSpoofs = {};
        for (const item of trackSpoofsReq.result as (Track & { id: string })[]) {
            if (item.coverUri && (item.coverUri as any) instanceof Blob) {
                item.coverUri = URL.createObjectURL(item.coverUri as any);
            }
            localSource.trackSpoofs[item.id] = item;
            delete (item as any).id;
        }

        localSource.albumSpoofs = {};
        for (const item of albumSpoofsReq.result as (Album & { id: string })[]) {
            if (item.coverUri && (item.coverUri as any) instanceof Blob) {
                item.coverUri = URL.createObjectURL(item.coverUri as any);
            }
            localSource.albumSpoofs[item.id] = item;
            delete (item as any).id;
        }

        localSource.artistSpoofs = {};
        for (const item of artistSpoofsReq.result as (Artist & { id: string })[]) {
            if (item.cover?.uri && (item.cover.uri as any) instanceof Blob) {
                item.cover.uri = URL.createObjectURL(item.cover.uri as any);
            }
            localSource.artistSpoofs[item.id] = item;
            delete (item as any).id;
        }

        localSource.artistsInsertions = {};
        for (const item of artistInsertionsReq.result as (ArtistInsertions & { id: string })[]) {
            localSource.artistsInsertions[item.id] = item;
        }

        postProcessingInsertions(localSource.artistsInsertions, localSource.trackSpoofs, localSource.albumSpoofs);
        debug("POST PROCESSING", localSource.artistsInsertions, localSource.trackSpoofs, localSource.albumSpoofs);
        sources.pushSource(localSource);

        log("Loaded local data:", {
            tracks: localSource.replacementsTrackIds.length,
            trackSpoofs: Object.keys(localSource.trackSpoofs).length,
            albumSpoofs: Object.keys(localSource.albumSpoofs).length,
            artistSpoofs: Object.keys(localSource.artistSpoofs).length,
        });
    } catch (err) {
        console.error("Failed to load local DB:", err);
    }
}

const MAX_TRACKS_CACHE_LENGTH = 4;

export class LocalSource implements Source {
    private readonly playerReplacementsCache: Map<string, TrackReplacement> = new Map<string, TrackReplacement>();
    
    public replacementsTrackIds: string[] = [];
    public artistsInsertions: Record<string, ArtistInsertions> = {};
    public trackSpoofs: Record<string, Track> = {};
    public albumSpoofs: Record<string, Album> = {};
    public artistSpoofs: Record<string, Artist> = {};

    async buildPlayerReplacement(trackId: string): Promise<TrackReplacement | null> {
        if (this.playerReplacementsCache.has(trackId)) {
            return this.playerReplacementsCache.get(trackId)!;
        }
        const db = await getDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(TRACKS, "readonly");
            const store = tx.objectStore(TRACKS);
            const request = store.get(trackId);

            request.onsuccess = () => {
                if (request.result && request.result.data) {
                    const url = URL.createObjectURL(request.result.data);
                    const replacement = new TrackReplacement(this, url);
                    if (this.playerReplacementsCache.size > MAX_TRACKS_CACHE_LENGTH) {
                        const oldestKey = this.playerReplacementsCache.keys().next().value!;
                        const oldestUrl = this.playerReplacementsCache.get(oldestKey);
                        URL.revokeObjectURL(oldestUrl!.url);
                        this.playerReplacementsCache.delete(oldestKey);
                    }
                    this.playerReplacementsCache.set(trackId, replacement);
                    resolve((replacement));
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    hasPlayerReplacement(trackId: string): boolean {
        return this.replacementsTrackIds.includes(String(trackId)) || this.playerReplacementsCache.has(trackId);
    }

    getTrackSpoof(trackId: string): Track | null {
        const track = {}
        if (this.hasPlayerReplacement(trackId)) {
            Object.assign(track, getTrackAvaiableSpoof());
        }
        if (trackId in this.trackSpoofs) {
            Object.assign(track, this.trackSpoofs[trackId]);
        }
        else {
            debug("RETURNING NULL")
            return null;
        }

        return track as Track;
    }

    getAlbumSpoof(albumId: string): Album | null {
        if (albumId in this.albumSpoofs) {
            return this.albumSpoofs[albumId];
        }
        return null;
    }

    getArtistSpoof(artistId: string): Artist | null {
        if (artistId in this.artistSpoofs) {
            return this.artistSpoofs[artistId];
        }
        return null;
    }

    getArtistInsertions(artistId: string): ArtistInsertions | null {
        return this.artistsInsertions[artistId];
    }

    isRemoteException(trackId: string): boolean {
        return false;
    }

    pushTrackReplacement(trackId: string, file: File) {
        if (!this.replacementsTrackIds.includes(trackId)) {
            this.replacementsTrackIds.push(trackId);
        }

        reloadPlayer(trackId);
        return this.pushToDb(TRACKS, trackId, { data: file });
        //await this.buildPlayerReplacement(strId);
    }

    removeTrackReplacement(trackId: string) {
        this.replacementsTrackIds = this.replacementsTrackIds.filter(x => x !== trackId);
        if (this.playerReplacementsCache.has(trackId)) {
            URL.revokeObjectURL(this.playerReplacementsCache.get(trackId)!.url);
            this.playerReplacementsCache.delete(trackId);
            reloadPlayer(trackId);
        }
        return this.removeFromDb(TRACKS, trackId);
    }

    pushTrackSpoof(track: Track, trackId?: string) {
        const id = String(trackId || track.id);

        const oldTrack = this.trackSpoofs[id];
        if (oldTrack?.coverUri?.startsWith("blob:")) {
            URL.revokeObjectURL(oldTrack.coverUri);
        }

        const dbTrack = { ...track };
        if (track.coverUri && (track.coverUri as any) instanceof Blob) {
            track.coverUri = URL.createObjectURL(track.coverUri as any);
        }

        this.trackSpoofs[id] = track;
        return this.pushToDb(TRACK_SPOOFS, id, dbTrack);
    }

    removeTrackSpoof(trackId: string) {
        delete this.trackSpoofs[trackId];
        return this.removeFromDb(TRACK_SPOOFS, trackId);
    }

    pushAlbumSpoof(album: Album, albumId?: string) {
        const id = String(albumId || album.id);

        const oldAlbum = this.albumSpoofs[id];
        if (oldAlbum?.coverUri?.startsWith("blob:")) {
            URL.revokeObjectURL(oldAlbum.coverUri);
        }

        const dbAlbum = { ...album };
        if (album.coverUri && (album.coverUri as any) instanceof Blob) {
            album.coverUri = URL.createObjectURL(album.coverUri as any);
        }

        this.albumSpoofs[id] = album;
        return this.pushToDb(ALBUM_SPOOFS, id, dbAlbum);
    }

    removeAlbumSpoof(albumId: string) {
        delete this.albumSpoofs[albumId]
        return this.removeFromDb(ALBUM_SPOOFS, albumId);
    }

    pushArtistSpoof(artist: Artist, artistId?: string) {
        const id = String(artistId || artist.id);

        const oldArtist = this.artistSpoofs[id];
        if (oldArtist?.cover?.uri?.startsWith("blob:")) {
            URL.revokeObjectURL(oldArtist.cover.uri);
        }

        const dbArtist = { ...artist };
        if (artist.cover?.uri && (artist.cover.uri as any) instanceof Blob) {
            artist.cover.uri = URL.createObjectURL(artist.cover.uri as any);
        }

        this.artistSpoofs[id] = artist;
        return this.pushToDb(ARTIST_SPOOFS, id, dbArtist);
    }

    removeArtistSpoof(artistId: string) {
        delete this.artistSpoofs[artistId];
        return this.removeFromDb(ARTIST_SPOOFS, artistId);
    }

    pushArtistInsertions(artistId: string, insertions: ArtistInsertions) {
        debug("PUSHING", artistId, insertions)
        this.artistsInsertions[artistId] = insertions;
        return this.pushToDb(ARTIST_INSERTIONS, artistId, insertions);
    }

    removeArtistInsertions(artistId: string) {
        delete this.artistsInsertions[artistId];
        return this.removeFromDb(ARTIST_INSERTIONS, artistId);
    }

    private async openStore(table_name: string, mode: IDBTransactionMode = "readwrite") {
        const db = await getDb();
        return db.transaction(table_name, mode)
                 .objectStore(table_name);
    }

    private async removeFromDb(table_name: string, id: string) {
        const store = await this.openStore(table_name);
        store.delete(id);
    }

    private async pushToDb(table_name: string, id: string, value: any) {
        const store = await this.openStore(table_name);
        store.put({ ...value, id });
    }
}

export const localSource = new LocalSource();