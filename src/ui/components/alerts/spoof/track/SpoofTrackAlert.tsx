import { localSource } from "@/api/db-api";
import { Track } from "@/types";
import { restoreOriginalValues } from "@/utils/music";
import { debug } from "@/utils/logger";
import { SpoofEntityWithArtistsAlert } from "../base/artists/SpoofEntityWithArtistsAlert";
import { SpoofAudioField } from "./SpoofAudioField";
import { sources } from "@/api/main-api";
import { spoofNode } from "@/utils/ui-utils";
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
                              <ActionButton>Сообщить о цензуре</ActionButton>; // #TODO 
    }

    private onLocalTrackLinkCopy() {
        const BASE_URL = "fckcensor://track/";
        const url = BASE_URL + this.id;
        navigator.clipboard.writeText(url).then(() => {
            window.pulsesyncApi?.showNotification?.(`Ссылка на локальный трек скопирована в буфер обмена. Вставьте ее в окно подмены альбома или исполнителя.`, "info", { 
                durationMs: 4e3,
                icon: 'share',
             });
        })
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
            spoofNode(this.sourceNode, this.entity)
        }
    }

    protected async onSpoofRemove() {
        await localSource.removeTrackSpoof(this.id);
        await localSource.removeTrackReplacement(this.id);
    }

    protected getPrevSpoofedData() {
        return sources.getTrackSpoof(this.id);
    }
}