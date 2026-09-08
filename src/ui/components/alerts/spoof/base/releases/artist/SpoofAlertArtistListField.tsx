import { Release, Track } from "@/types";
import { IGetValue } from "@/ui/components/IGetValue";
import { SpoofAlertBase } from "../../SpoofAlertBase";
import { DiskNode } from "../album/SpoofAlertAlbumTrackListField";
import { SpoofAlertReleasesListField } from "../SpoofAlertReleasesListField";
import { sources } from "@/api/main-api";
import ElementWrap from "@/ui/components/ElementWrap";
import { ReleaseNode } from "../ReleaseNode";
import { getTracks } from "@/utils/music";
import { debug } from "@/utils/logger";
import { Insertion } from "@/api/dto/artist-insertion";

export class SpoofAlertArtistListField extends SpoofAlertReleasesListField implements IGetValue<Insertion[]> {
    getValue(): Insertion[] {
        return this.valueToProperty()
    }
    
    valueToProperty() {
        const s = this.releases?.map(x => ({ releaseId: String(x.id), index: 0 })) ?? [];
        debug("SPOKPOD", s)
        return s
    }
    
    public constructor(alert: SpoofAlertBase, type: "track" | "album") {
        super(alert, type == "track" ? "Треки" : "Альбомы" + ", добавленные в профиль исполнителя", type, sources.getArtistInsertions(alert.artist.id));
    }

    public releases?: Release[]
    private getting = false;

    protected fillElements() {
        let tracks: Release[] = [];
        if (!this.releases) {
            const t = sources.getArtistInsertions(this.alert.artist.id)?.[(this.type + "s") as "tracks" | "albums"]
            debug(t);
            
            if (t) {
                let get = false;
                t.forEach((release, i) => {
                    if (this.releases && this.releases[i].id == release.releaseId) {
                        tracks.push(this.releases[i])
                    }
                    else {
                        get = true;
                        tracks.push({ "id": release.releaseId })
                    }
                })

                if (get && !this.getting) {
                    this.getting = true;
                    getTracks(...t.map(release => release.releaseId)).then(releases => {
                        this.releases = releases;
                        this.getting = false;
                        this.reRenderElement();
                    })
                }
            }
        }
        else {
            tracks = this.releases;
        }
        return tracks.map(x => new ArtistReleaseNode(x, this));
    }

    protected onReleaseAdd(release: Release): void {
        this.releases?.push(release);
    }
}

export class ArtistReleaseNode extends ElementWrap implements IGetValue<Release> {
    protected createElement(): HTMLElement {
        return <ReleaseNode onremove={this.onRemove.bind(this)} release={this.release}/>;
    }

    private onRemove() {
        this.field.releases?.splice(this.field.releases.indexOf(this.release), 1);
        this.field.reRenderElement();
    }

    constructor(private readonly release: Release, private readonly field: SpoofAlertArtistListField) {
        super();
    }

    getValue(): Release {
        return this.release
    }
}