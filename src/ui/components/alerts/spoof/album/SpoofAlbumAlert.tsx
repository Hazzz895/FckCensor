import { Album, Track } from "@/types";
import { SpoofEntityWithArtistsAlert } from "../base/artists/SpoofEntityWithArtistsAlert";
import { sources } from "@/api/main-api";
import { localSource } from "@/api/db-api";
import { debug, error } from "@/utils/logger";
import { spoofAllNodesFor } from "@/utils/ui-utils";
import { SpoofAlertAlbumTrackListField } from "../base/releases/album/SpoofAlertAlbumTrackListField";
import { SwitchField } from "@/ui/components/SwitchField";
import { reloadAlbumPage } from "@/utils/music";

export class SpoofAlbumAlert extends SpoofEntityWithArtistsAlert<Album> {
    public constructor(data: Album, scrim: HTMLElement, albumNode: HTMLElement) {
        super(data, "album", "Подмена альбома", albumNode, scrim);
    }

    declare private spoofVolumesArtistsSwitch: SwitchField

    private originalVolumesId?: string;

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
        this.updateSpoofVolumesArtistsSwitch();
    }

    protected forceSpoof() {
        return this.spoofVolumesArtistsSwitch.hasDiffs(this.spoofVolumesArtistsSwitch.value);
    }

    protected async onApply(spoofData: Album) {
        this.originalVolumesId = this.getVolumesId();
        if (this.spoofVolumesArtistsSwitch.value) {
            spoofData.__fckCensor ??= {};
            spoofData.__fckCensor.replaceArtistsInAlbumVolumes = true;
        }
        localSource.pushAlbumSpoof(spoofData, this.id)
        spoofAllNodesFor("album", this.id);
    }

    protected async onSpoofRemove() {
        this.originalVolumesId = this.getVolumesId();
        localSource.removeAlbumSpoof(this.id);
    }

    protected async afterSpoofChanged() {
        const before = this.originalVolumesId ?? "";
        const after = this.getVolumesId();

        if (before === after) return;

        try {
            await reloadAlbumPage(this.id);
        } catch (e) {
            error(e);
        }
    }

    private getVolumesId(volumes?: Track[][] | null): string {
        volumes ??= sources.getAlbumSpoof(this.id)?.volumes;
        if (!volumes || volumes.length === 0) return "";
        return volumes.map(disk => disk.map(t => String(t.id)).join(",")).join("|");
    }

    protected getPrevSpoofedData() {
        return sources.getAlbumSpoof(this.id);
    }
}
