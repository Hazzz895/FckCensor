import { Album, Artist, OuterArtist, SpoofableEntity, SpoofableType, Track } from '@/types'
import TrackReplacement from '../track-replacement'
import { ArtistInsertions } from '../artist-insertion'

export default interface ISource {
    getKnownIds?(type: SpoofableType): Iterable<string>
    buildPlayerReplacement(trackId: string): Promise<TrackReplacement | null>

    hasPlayerReplacement(trackId: string): boolean | null

    getTrackSpoof(trackId: string): Track | null

    getAlbumSpoof(albumId: string): Album | null

    getArtistSpoof(artistId: string): Artist | null

    getArtistInsertions(artistId: string): ArtistInsertions | null
}

export abstract class Source implements ISource {
    getKnownIds(_type: SpoofableType): Iterable<string> {
        return []
    }
    abstract buildPlayerReplacement(trackId: string): Promise<TrackReplacement | null>
    abstract hasPlayerReplacement(trackId: string): boolean | null
    abstract getTrackSpoof(trackId: string): Track | null
    abstract getAlbumSpoof(albumId: string): Album | null
    abstract getArtistSpoof(artistId: string): Artist | null
    abstract getArtistInsertions(artistId: string): ArtistInsertions | null

    public getSpoof<T extends SpoofableEntity>(type: SpoofableType, id: string): T | null {
        return (type == 'album' ? this.getAlbumSpoof : type == 'artist' ? this.getArtistSpoof : this.getTrackSpoof).bind(this)(id) as T | null
    }

    public hasSpoof(type: SpoofableType, id: string): boolean {
        return !!this.getSpoof(type, id)
    }
}
