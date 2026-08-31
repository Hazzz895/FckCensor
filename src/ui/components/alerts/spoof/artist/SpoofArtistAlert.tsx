import { Artist } from "@/types";
import { SpoofAlertBase } from "../base/SpoofAlertBase";
import { sources } from "@/api/main-api";
import { localSource } from "@/api/db-api";
import { runUnprotected } from "@/utils/ui-utils";
import { debug } from "@/utils/logger";

export class SpoofArtistAlert extends SpoofAlertBase<Artist> {
    public constructor(data: Artist, scrim: HTMLElement, artistNode: HTMLElement) {
        super(data, "artist", "Подмена исполнителя", artistNode, scrim);
    }

    protected async onApply(spoofData: Artist){
        localSource.pushArtistSpoof(spoofData, this.id);
        runUnprotected(this.entity, () => {
            sources.spoofArtist(this.entity)
            debug("SPOOFFED", this.entity)
        })
    }

    protected async onSpoofRemove() {
        localSource.removeArtistSpoof(this.id)
    }

    protected getChildren(): HTMLElement {
        return <div></div>
    }

    protected getPrevSpoofedData() {
        return sources.getArtistSpoof(this.id);
    }
}