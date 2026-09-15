import { JSX } from "@/jsx-runtime";
import { TrackMST, Artist, Album, Track, SpoofableType } from "@/types";
import { getTrackFromNode } from "@/utils/ui-utils";
import { debug } from "@/utils/logger";
import { SpoofTrackAlert } from "./track/SpoofTrackAlert";
import { SpoofArtistAlert } from "./artist/SpoofArtistAlert";
import { SpoofAlbumAlert } from "./album/SpoofAlbumAlert";
import { localizeSpoofableType } from "@/utils/common";
import addonConfig from "@/../addon.config.mjs";

export function createTrackSpoofAlertFor(scrim: HTMLElement, trackNode: HTMLElement, trackData?: Track | null) {
    if (trackData === undefined) {
        trackData = getTrackFromNode(trackNode)!;
    }

    if (trackData !== null) {
        return new SpoofTrackAlert(trackData, scrim, trackNode);
    }

    showNoDataError("track");
}

export function createArtistSpoofAlertFor(scrim: HTMLElement, artistData: Artist | null) {
    if (artistData !== null) {
        return new SpoofArtistAlert(artistData, scrim, scrim);
    }

    showNoDataError("artist");
}

export function createAlbumSpoofAlertFor(scrim: HTMLElement, albumData: Album | null) {
    if (albumData !== null) {
        return new SpoofAlbumAlert(albumData, scrim, scrim);
    }

    showNoDataError("album");
}

function showNoDataError(type: SpoofableType) {
    window.pulsesyncApi?.showModal?.("alert", {
        "title": "Ой!",
        "message": localizeSpoofableType(type) + " не найден... Скорее всего, это ошибка на стороне аддона, сообщите об этом в ветке аддона в дискорде. А сейчас стоит попытаться открыть это окно в другом месте.",
    }, addonConfig?.id)
}

export interface CoverProps extends JSX.HTMLAttributes {
    src?: string;
    mini?: boolean
}


