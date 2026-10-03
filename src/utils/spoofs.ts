import { sources } from "@/api/main-api";
import Source from "@/api/dto/sources/source";
import { SpoofableEntity, SpoofableType, Track } from "@/types";

export function getSpoof<T extends SpoofableEntity>(source: Source, type: SpoofableType, id: string): T | null {
    return (type == "album" ? source.getAlbumSpoof : type == "artist" ? source.getArtistSpoof : source.getTrackSpoof).bind(source)(id) as T;
}

export function spoofEntity<T extends SpoofableEntity>(type: SpoofableType, entity: T): T | null {
    return (type == "album" ? sources.spoofAlbum : type == "artist" ? sources.spoofAnyArtist : sources.spoofTrack).bind(sources)(entity as any) as T;
}

export function hasSpoof(source: Source, type: SpoofableType, id: string): boolean {
    return !!getSpoof(source, type, id);
}

export function getTrackAvaiableSpoof(): Track {
    return {
        available: true,
        error: undefined
    } as any;
}

const aliases: [raw: string, mst: string][] = [
    ["available", "isAvailable"],
];

export function convertRawMst<T>(entity: T, toMst: boolean): T {
    const any = entity as any;
    for (const [raw, mst] of aliases) {
        const [from, to] = toMst ? [raw, mst] : [mst, raw];
        if (from in any) {
            if (!(to in any)) any[to] = any[from];
            delete any[from];
        }
    }
    return entity;
}