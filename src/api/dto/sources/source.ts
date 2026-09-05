import { Album, Artist, OuterArtist, Track } from "@/types";
import TrackReplacement from "../track-replacement";
import { ArtistInsertions } from "../artist-insertion";

export default interface Source {
    buildPlayerReplacement(trackId: string): Promise<TrackReplacement | null>

    hasPlayerReplacement(trackId: string): boolean

    getTrackSpoof(trackId: string): Track | null

    getAlbumSpoof(albumId: string): Album | null

    getArtistSpoof(artistId: string): Artist | null

    getArtistInsertions(artistId: string): ArtistInsertions | null
}