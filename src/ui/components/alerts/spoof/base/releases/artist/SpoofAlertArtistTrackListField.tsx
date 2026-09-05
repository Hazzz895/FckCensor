import { Track } from "@/types";
import { IGetValue } from "@/ui/components/IGetValue";
import { SpoofAlertBase } from "../../SpoofAlertBase";
import { DiskNode } from "../album/SpoofAlertAlbumTrackListField";
import { SpoofAlertReleasesListField } from "../SpoofAlertReleasesListField";

/*export class SpoofAlertAlbumTrackListField extends SpoofAlertReleasesListField<DiskNode> implements IGetValue<Track[]> {
    public constructor(alert: SpoofAlertBase) {
        super(alert, "track");
    }

    protected fillElements(): DiskNode[] {
        return this.alert.artist.
    }

    public getValue() {
        return this.releaseNodes.map(node => node.getValue());
    }
}*/