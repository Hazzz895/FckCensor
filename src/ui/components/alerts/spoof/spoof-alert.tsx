import { JSX } from "@/jsx-runtime";
import { TrackMST, Artist, Album } from "@/types";
import { getTrackFromNode } from "@/utils/ui-utils";
import { debug } from "@/utils/logger";
import { SpoofTrackAlert } from "./track/SpoofTrackAlert";
import { SpoofArtistAlert } from "./artist/SpoofArtistAlert";
import { SpoofAlbumAlert } from "./album/SpoofAlbumAlert";

export function createTrackSpoofAlertFor(scrim: HTMLElement, trackNode: HTMLElement, trackData?: TrackMST) {
    if (!trackData) {
        trackData = getTrackFromNode(trackNode)!;
    }

    return new SpoofTrackAlert(trackData, scrim, trackNode);
}

export function createArtistSpoofAlertFor(scrim: HTMLElement, artistData: Artist) {
    return new SpoofArtistAlert(artistData, scrim, scrim);
}

export function createAlbumSpoofAlertFor(scrim: HTMLElement, albumData: Album) {
    return new SpoofAlbumAlert(albumData, scrim, scrim);
}

export interface CoverProps extends JSX.HTMLAttributes {
    src?: string;
    mini?: boolean
}


