import { localSource } from "@/api/db-api";
import { Track } from "@/types";
import { restoreOriginalValues } from "@/utils/music";
import { spoofTrackNode } from "@/utils/ui-utils";
import { debug } from "@/utils/logger";
import { SpoofEntityWithArtistsAlert } from "../base/SpoofEntityWithArtistsAlert";
import { SpoofAudioField } from "./SpoofAudioField";
import { sources } from "@/api/main-api";

export class SpoofTrackAlert extends SpoofEntityWithArtistsAlert<Track> {
    public constructor(data: Track, scrim: HTMLElement, trackNode: HTMLElement) {
        super(data, "track", "Подмена трека", trackNode, scrim);
    }

    declare private spoofAudioField: SpoofAudioField;

    protected getChildren(): HTMLElement {
        this.spoofAudioField = new SpoofAudioField(this);
        return <div>
            {super.getChildren()}
            {this.spoofAudioField.element}
        </div>
    }

    protected forceSpoof(): boolean {
        return this.spoofAudioField.hasChanges;
    }

    protected async onApplyInternal() {
        if (this.spoofAudioField.hasChanges) {
            if (this.spoofAudioField.file) {
                await localSource.pushTrackReplacement(this.id, this.spoofAudioField.file)
            }
            else {
                await localSource.removeTrackReplacement(this.id);
            }
        }
        super.onApplyInternal();
    }

    async onApply(spoofData: Track) {
        await localSource.pushTrackSpoof(spoofData, this.id)
        if (this.sourceNode) {
            debug(this.sourceNode)
            spoofTrackNode(this.sourceNode)
        }
    }

    protected async onSpoofRemove() {
        await localSource.removeTrackSpoof(this.id);
        await localSource.removeTrackReplacement(this.id);
        if (this.sourceNode) {
            restoreOriginalValues(this.entity);
            spoofTrackNode(this.sourceNode)
        }
    }

    protected getPrevSpoofedData() {
        return sources.getTrackSpoof(this.id);
    }
}