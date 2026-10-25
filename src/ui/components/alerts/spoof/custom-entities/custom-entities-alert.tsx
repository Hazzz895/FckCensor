import { Album, Artist, Release } from "@/types";
import { CustomAlbumAlert } from "./album/CustomAlbumAlert";
import { getLastCustomEntityId } from "./custom-entity-id-counter";
import { CustomTrackAlert } from "./track/CustomTrackAlert";

function createCustomReleaseAlert<T>(artist: Artist, scrim: HTMLElement | undefined, clz: new (data: any, scrim?: HTMLElement) => T) {
    const data = {
        id: getLastCustomEntityId(),
        artists: [artist],
    }
    return new clz(data, scrim)
}

export function createCustomAlbumAlertFor(artist: Artist, scrim?: HTMLElement) {
    return createCustomReleaseAlert(artist, scrim, CustomAlbumAlert)
}

export function createCustomTrackAlertFor(artist: Artist, scrim?: HTMLElement) {
    return createCustomReleaseAlert(artist, scrim, CustomTrackAlert)
}