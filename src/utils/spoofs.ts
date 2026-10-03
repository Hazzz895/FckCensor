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

export function convertRawMst(entity: SpoofableEntity, toMst: Boolean): SpoofableEntity {
    function setAlias(obj: any, [from, to]: [string, string]) {
        if (!toMst) {
            from = to;
            to = from;
        }
        if (from in obj) {
            obj[to] = obj[from];
            delete obj[from];
        }
    }

    const copy = { ...entity } as any;
    setAlias(copy, ["available", "isAvailable"]);
    return copy;
}