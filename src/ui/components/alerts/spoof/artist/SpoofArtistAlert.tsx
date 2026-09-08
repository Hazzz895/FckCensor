import { Artist } from "@/types";
import { SpoofAlertBase } from "../base/SpoofAlertBase";
import { sources } from "@/api/main-api";
import { localSource } from "@/api/db-api";
import { runUnprotected } from "@/utils/ui-utils";
import { debug } from "@/utils/logger";
import { SpoofAlertArtistListField } from "../base/releases/artist/SpoofAlertArtistListField";
import { isEmptyObject } from "@/utils/common";


export class SpoofArtistAlert extends SpoofAlertBase<Artist> {
    public constructor(data: Artist, scrim: HTMLElement, artistNode: HTMLElement) {
        super(data, "artist", "Подмена исполнителя", artistNode, scrim);
    }

    protected async onApply(spoofData: Artist){
        debug("DOIJDJOIDJI")
        if (!isEmptyObject(spoofData)) {
            localSource.pushArtistSpoof(spoofData, this.id);
            runUnprotected(this.entity, () => {
                sources.spoofArtist(this.entity)
            })
        }
        
        if (this.forceSpoof()) {
            const insertions = { tracks: this.trackListField.getValue(), albums: this.albumListField.getValue() };
            debug("INSERTIONS", insertions)
            await localSource.pushArtistInsertions(this.id, insertions);
        }
    }

    protected forceSpoof() {
        return this.trackListField.hasChanges || this.albumListField.hasChanges
    }

    protected async onSpoofRemove() {
        localSource.removeArtistSpoof(this.id)
        localSource.removeArtistInsertions(this.id)
    }

    declare private trackListField: SpoofAlertArtistListField
    declare private albumListField: SpoofAlertArtistListField

    protected getChildren(): HTMLElement {
        return <div>
            {(this.trackListField = new SpoofAlertArtistListField(this, "track")).element}
            {(this.albumListField = new SpoofAlertArtistListField(this, "album")).element}
        </div>
    }

    protected getPrevSpoofedData() {
        return sources.getArtistSpoof(this.id);
    }
}