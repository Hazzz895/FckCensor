import { Album, Release, Track } from "@/types";

export interface ArtistInsertions {
    tracks: Insertion<Track>[];
    albums: Insertion<Album>[];
}

export interface Insertion<T extends Release> {
    index?: number;
    release: T;
}