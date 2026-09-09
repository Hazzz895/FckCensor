import { Album } from "@/types";
import { SpoofEntityWithArtistsAlert } from "../base/artists/SpoofEntityWithArtistsAlert";
import { sources } from "@/api/main-api";
import { localSource } from "@/api/db-api";
import { debug } from "@/utils/logger";
import { runUnprotected } from "@/utils/ui-utils";
import { SpoofAlertAlbumTrackListField } from "../base/releases/album/SpoofAlertAlbumTrackListField";
import { SwitchField } from "@/ui/components/SwitchField";

export class SpoofAlbumAlert extends SpoofEntityWithArtistsAlert<Album> {
    public constructor(data: Album, scrim: HTMLElement, albumNode: HTMLElement) {
        super(data, "album", "Подмена альбома", albumNode, scrim);
    }

    declare private spoofVolumesArtistsSwitch: SwitchField

    protected getChildren(): HTMLElement {
        const el = <div>
            {super.getChildren()}
            {(this.spoofVolumesArtistsSwitch = new SwitchField("Включить подмену исполнителей", false)).element}
            {this.addPropertyField(new SpoofAlertAlbumTrackListField(this))}
        </div>
        this.updateSpoofVolumesArtistsSwitchVisibility();
        this.artistsField.setOnAddListener(this.onArtistAdd.bind(this));
        return el;
    }

    private updateSpoofVolumesArtistsSwitchVisibility(): boolean {
        const show = this.artistsField.hasDiffs(this.artistsField.valueToProperty(), this.entity?.__fckCensor?.originalValues?.artists);
        this.spoofVolumesArtistsSwitch.element.hidden = !show;
        return show
    }

    private onArtistAdd() {
        this.updateSpoofVolumesArtistsSwitchVisibility();
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
