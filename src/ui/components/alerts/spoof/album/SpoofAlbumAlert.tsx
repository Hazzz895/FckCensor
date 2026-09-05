import { Album } from "@/types";
import { SpoofEntityWithArtistsAlert } from "../base/artists/SpoofEntityWithArtistsAlert";
import { sources } from "@/api/main-api";
import { localSource } from "@/api/db-api";
import { debug } from "@/utils/logger";
import { runUnprotected } from "@/utils/ui-utils";
import { SpoofAlertAlbumTrackListField } from "../base/releases/album/SpoofAlertAlbumTrackListField";

export class SpoofAlbumAlert extends SpoofEntityWithArtistsAlert<Album> {
    public constructor(data: Album, scrim: HTMLElement, albumNode: HTMLElement) {
        super(data, "album", "Подмена альбома", albumNode, scrim);
    }

    declare private trackList

    protected getChildren(): HTMLElement {
        return <div>
            {super.getChildren()}
            {(this.trackList = new SpoofAlertAlbumTrackListField(this)).element}
        </div>
    }

    protected async onApply(spoofData: Album) {
        localSource.pushAlbumSpoof(spoofData, this.id)
        runUnprotected(this.entity, () => {
            sources.spoofAlbum(this.entity)
        })
    }

    protected async onSpoofRemove() {
        localSource.removeAlbumSpoof(this.id);
    }

    protected getPrevSpoofedData() {
        return sources.getAlbumSpoof(this.id);
    }
}