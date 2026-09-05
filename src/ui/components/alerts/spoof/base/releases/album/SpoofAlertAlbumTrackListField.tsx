import { Album, Release, Track } from "@/types";
import { SpoofAlertReleasesListField } from "../SpoofAlertReleasesListField";
import { SpoofAlertBase } from "../../SpoofAlertBase";
import { ReleaseNode } from "../ReleaseNode";
import ElementWrap from "@/ui/components/ElementWrap";
import { IGetValue } from "@/ui/components/IGetValue";
import { getAlbumTracks } from "@/utils/music";
import { debug } from "@/utils/logger";

export class SpoofAlertAlbumTrackListField extends SpoofAlertReleasesListField<DiskNode> implements IGetValue<Track[][]> {
    public constructor(alert: SpoofAlertBase) {
        debug(alert.album)
        super(alert, "track");
    }

    private tracks?: Track[][] | null

    protected fillElements(): DiskNode[] {
        this.tracks ??= this.alert.album.volumes;
        if (this.tracks === undefined) {
            getAlbumTracks(this.alert.album.id).then(a => {
                try {
                    this.tracks = a?.volumes ?? null;
                }
                catch {
                    this.tracks == null;
                }
                finally {
                    this.reRenderElement();
                }
            })
            return [new DiskNode(Array(this.alert.album.trackCount).fill(undefined), undefined)];
        }
        else if (this.tracks == null) {
            return []
        }
        else {
            return this.tracks.map((v, i) => new DiskNode(v, this.tracks!.length > 1 ? i : undefined));
        }
    }

    public getValue() {
        return this.releaseNodes.map(node => node.getValue());
    }
}

export class DiskNode extends ElementWrap implements IGetValue<Track[]> {
    public constructor(private readonly disk: (Track | undefined)[], private readonly index?: number) { super(); }

    protected createElement(): HTMLElement {
        const header = this.index !== undefined ? <div class="TextVolume_root__wxSaK"><h2 class="_MWOVuZRvUQdXKTMcOPx _sd8Q9d_Ttn0Ufe4ISWS nSU6fV9y80WrZEfafvww CommonAlbumPage_text__kqBSb">Диск {this.index + 1}</h2></div> : undefined;
        return <div>
            {header}
            {this.disk.map(t => <ReleaseNode onremove={(ev) => {}} release={t}/>)}
        </div>
    }

    public getValue(): Track[] {
        return this.disk as any;
    }
}