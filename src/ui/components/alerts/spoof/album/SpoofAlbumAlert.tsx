import { Album } from "@/types";
import { SpoofEntityWithArtistsAlert } from "../base/SpoofEntityWithArtistsAlert";
import { sources } from "@/api/main-api";
import { localSource } from "@/api/db-api";
import { debug } from "@/utils/logger";
import { runUnprotected } from "@/utils/ui-utils";

export class SpoofAlbumAlert extends SpoofEntityWithArtistsAlert<Album> {
    public constructor(data: Album, scrim: HTMLElement, albumNode: HTMLElement) {
        super(data, "album", "Подмена альбома", albumNode, scrim);
    }

    protected async onApply(spoofData: Album) {
        debug("SPOOF DATA", spoofData)
        debug("ENTITY", this.entity);
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