import { Album, Artist, FckCensorSpoofData, OuterArtist, SearchResponse, SearchType, Spoofable, SpoofableEntity, SpoofableType, Track } from "@/types";
import { debug, error, log } from "./logger";
import { findModule, getDiResource, hookDi } from "./hook-utils";
import { getAlbumFromNode, getArtistFromNode, getEntityNodesById, getTrackFromNode, runUnprotected } from "./ui-utils";
import Source from "@/api/dto/sources/source";
import { sources } from "@/api/main-api";

export function reloadPlayer(trackId?: string) {
    const e = window.sonataState?.queueState?.currentEntity?.value?.entity;
    const mediaPlayer = window.sonataState?.currentMediaPlayer?.value?.currentMediaPlayer as any;
    if (e && mediaPlayer && (!trackId || String(e.entityData?.meta?.id) == trackId)) {
        mediaPlayer.reload(e);
        log("Player reloaded");
    }
}

export function getTrackAvaiableSpoof(): Track {
    return {
        available: true,
        error: undefined
    } as any
}

export function restoreOriginalValues(data: Spoofable, fckCensorData?: FckCensorSpoofData | null) {
    const source = fckCensorData ?? data.__fckCensor;
    const originalValues = source?.originalValues;
    if (!originalValues) return;

    runUnprotected(data, () => {
        Object.assign(data, originalValues);
    });

    delete source.originalValues;
    if (data.__fckCensor && data.__fckCensor !== source) {
        delete data.__fckCensor.originalValues;
    }
}

export function restoreAllNodesByType(type: SpoofableType, id: string) {
    const originalValues = sources.getFckCensorData(type, id)?.originalValues;
    if (!originalValues) return;

    for (const node of getEntityNodesById(type, id)) {
        const entity = type === "track" ? getTrackFromNode(node)
                      : type === "album" ? getAlbumFromNode(node)
                      : getArtistFromNode(node);
        if (entity) {
            restoreOriginalValues(entity, { originalValues });
        }
    }
}

export function search(text: string, type: SearchType = "all", page=0, args: Record<string, any> = {}): Promise<SearchResponse | null> {
    return getDiResource("SearchResource")?.getInstantMixedSearch({
        "text": text,
        "type": type,
        "page": page,
        ...args
    })
}

export function searchArtists(text: string): Promise<SearchResponse | null> {
    return search(text, "artist");
}

export function getAlbumTracks(albumId: TrackId, ...args: any): Promise<Album | null> {
    return getDiResource("AlbumResource")?.getAlbumWithRichTracks({
        albumId,
        ...args
    })
}

export function getTracks(...trackIds: string[]): Promise<Track[]> {
    return getDiResource("TracksResource")?.getTracksMeta({ trackIds });
}

export function getAlbums(...albumIds: TrackId[]): Promise<Album[]> {
    return getDiResource("AlbumResource")?.getAlbums({
        albumIds: albumIds.map(Number)
    });
}

export function getOuterArtist(artistId: TrackId): Promise<OuterArtist> {
    return getDiResource("ArtistsResource")?.getInfo({ artistId });
}

export async function getArtist(artistId: TrackId): Promise<Artist> {
    return (await getOuterArtist(artistId)).artist;
}

export function getAudioMetadata(audioFile: File): Promise<HTMLAudioElement> {
   return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(audioFile);
        const audio = new Audio(url);
        audio
        audio.addEventListener('loadedmetadata', () => {
            URL.revokeObjectURL(url);
            resolve(audio);
        });

        audio.addEventListener('error', (err) => {
            URL.revokeObjectURL(url);
            reject(new Error(`Failed to read audio meta. ${err.error}`));
        });
    });
}

export function getSpoof<T extends SpoofableEntity>(source: Source, type: SpoofableType, id: string): T | null {
    return (type == "album" ? source.getAlbumSpoof : type == "artist" ? source.getArtistSpoof : source.getTrackSpoof).bind(source)(id) as T
}

export function hasSpoof(source: Source, type: SpoofableType, id: string): boolean {
    return !!getSpoof(source, type, id);
}