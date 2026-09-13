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

    protected getChildren() {
        const fckCensorData = sources.getFckCensorData("album", this.id);
        const el = <div>
            {super.getChildren()}
            {(this.spoofVolumesArtistsSwitch = new SwitchField(this, "Подменить исполнителей для треков", undefined, !!fckCensorData?.replaceArtistsInAlbumVolumes)).element}
            {this.addPropertyField(new SpoofAlertAlbumTrackListField(this))}
        </div>
        this.updateSpoofVolumesArtistsSwitch();
        this.artistsField.setOnChangedListener(this.onArtistAdd.bind(this));
        return el;
    }

    private updateSpoofVolumesArtistsSwitch(): boolean {
        const originalArtists = sources.getFckCensorData("album", this.id)?.originalValues?.artists ?? this.album.artists;
        const show = this.artistsField.hasDiffs(this.artistsField.getValue(), originalArtists);
        this.spoofVolumesArtistsSwitch.disabled = !show;
        return show
    }

    private onArtistAdd() {
        debug("ADDED")
        this.updateSpoofVolumesArtistsSwitch();
    }

    protected forceSpoof() {
        return this.spoofVolumesArtistsSwitch.hasDiffs(this.spoofVolumesArtistsSwitch.value);
    }

    protected async onApply(spoofData: Album) {
        debug(this.spoofVolumesArtistsSwitch.value)
        if (this.spoofVolumesArtistsSwitch.value) {
            spoofData.__fckCensor ??= {};
            spoofData.__fckCensor.replaceArtistsInAlbumVolumes = true;
        }
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
