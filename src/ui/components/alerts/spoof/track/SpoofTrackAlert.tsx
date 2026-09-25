import { localSource } from "@/api/db-api";
import { Track } from "@/types";
import { restoreOriginalValues } from "@/utils/music";
import { debug } from "@/utils/logger";
import { SpoofEntityWithArtistsAlert } from "../base/artists/SpoofEntityWithArtistsAlert";
import { SpoofAudioField } from "./SpoofAudioField";
import { sources } from "@/api/main-api";
import { showNotificationWithCover, spoofAllNodesFor } from "@/utils/ui-utils";
import { ActionButton } from "../../alerts";

export class SpoofTrackAlert extends SpoofEntityWithArtistsAlert<Track> {
    public constructor(data: Track, scrim: HTMLElement, trackNode: HTMLElement) {
        super(data, "track", "Подмена трека", trackNode, scrim);
    }

    declare private spoofAudioField: SpoofAudioField;

    protected getChildren(): HTMLElement {
        return <div>
            {super.getChildren()}
            {this.addPropertyField(this.spoofAudioField = new SpoofAudioField(this))}
        </div>
    }

    protected forceSpoof(): boolean {
        return this.spoofAudioField.hasChanges;
    }

    protected getAdditionalButtons() {
        const isLocalTrack = !(this.track.hasTrackLink ?? true);
        return isLocalTrack ? <ActionButton onclick={this.onLocalTrackLinkCopy.bind(this)}>Скопировать ссылку</ActionButton> :
                              super.getAdditionalButtons(); // #TODO 
    }

    private onLocalTrackLinkCopy() {
        const BASE_URL = "fckcensor://track/";
        const url = BASE_URL + this.id;
        navigator.clipboard.writeText(url).then(() => {
            showNotificationWithCover(this.entity, `Ссылка на локальный трек скопирована в буфер обмена. Вставьте ее в окно подмены альбома или исполнителя.`, "info", { 
                durationMs: 4e3,
                icon: 'share',
             });
        })
    }

    protected async onApplyInternal() {
        await this.spoofAudioField.onApply();
        await super.onApplyInternal();
    }

    async onApply(spoofData: Track) {
        await localSource.pushTrackSpoof(spoofData, this.id)
        spoofAllNodesFor("track", this.id);
    }

    protected async onSpoofRemove() {
        await localSource.removeTrackSpoof(this.id);
        await localSource.removeTrackReplacement(this.id);
    }

    protected async onSpoofCancel() {
        await super.onSpoofCancel();

        if (sources.hasPlayerReplacement(this.id)) {
            await localSource.pushTrackReplacementException(this.id);
        }
    }

    protected getPrevSpoofedData() {
        return sources.getTrackSpoof(this.id);
    }
}