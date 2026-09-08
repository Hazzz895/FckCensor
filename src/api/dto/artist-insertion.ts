export interface ArtistInsertions {
    tracks: Insertion[];
    albums: Insertion[];
}

export interface Insertion {
    index?: number;
    releaseId: string;
}