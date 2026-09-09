import { Release, Track } from "@/types";
import { IGetValue } from "@/ui/components/IGetValue";
import { SpoofAlertBase } from "../../SpoofAlertBase";
import { DiskNode } from "../album/SpoofAlertAlbumTrackListField";
import { SpoofAlertReleasesListField } from "../SpoofAlertReleasesListField";
import { sources } from "@/api/main-api";
import ElementWrap from "@/ui/components/ElementWrap";
import { ReleaseNode } from "../ReleaseNode";
import { getAlbums, getTracks } from "@/utils/music";
import { debug } from "@/utils/logger";
import { Insertion } from "@/api/dto/artist-insertion";

export class SpoofAlertArtistListField extends SpoofAlertReleasesListField implements IGetValue<Insertion[]> {
    getValue(): Insertion[] {
        return this.valueToProperty();
    }

    valueToProperty(): Insertion[] {
        return this.insertions ?? [];
    }

    public constructor(alert: SpoofAlertBase, type: "track" | "album") {
        super(
            alert,
            (type == "track" ? "Треки" : "Альбомы") + ", добавленные в профиль исполнителя",
            type,
            sources.getArtistInsertions(alert.artist.id)
        );
    }

    public insertions?: Insertion[];
    public releases?: Release[];
    private getting = false;

    protected fillElements() {
        const t = sources.getArtistInsertions(this.alert.artist.id)?.[(this.type + "s") as "tracks" | "albums"];
        debug(t);

        if (!t) {
            return [];
        }

        if (!this.insertions) {
            this.insertions = t.map(x => ({ releaseId: x.releaseId, index: x.index }));
        }

        const missingIds = this.insertions
            .filter(ins => !this.releases?.some(r => String(r.id) === ins.releaseId))
            .map(ins => ins.releaseId);

        if (missingIds.length && !this.getting) {
            this.getting = true;
            const method = this.type == "album" ? getAlbums : getTracks;
            method(...missingIds).then(releases => {
                this.releases = [...(this.releases ?? []), ...releases];
                this.getting = false;
                this.reRenderElement();
            });
        }

        return this.insertions.map(ins => {
            const release: Release =
                this.releases?.find(r => String(r.id) === ins.releaseId) ?? { id: ins.releaseId };
            return new ArtistReleaseNode(release, ins.index ?? -1, this);
        });
    }

    protected onReleaseAdd(release: Release): void {
        this.insertions?.push({ releaseId: String(release.id), index: -1 });
        this.releases?.push(release);
    }
}

export class ArtistReleaseNode extends ElementWrap implements IGetValue<Insertion> {
    constructor(
        private readonly release: Release,
        private index: number,
        private readonly field: SpoofAlertArtistListField
    ) {
        super();
    }

    protected createElement(): HTMLElement {
        return (
            <ReleaseNode
                index={this.index}
                onremove={this.onRemove.bind(this)}
                onIndexChange={this.onIndexChange.bind(this)}
                release={this.release as Release}
            />
        );
    }

    private onRemove() {
        const idx = this.field.insertions?.findIndex(x => x.releaseId === String(this.release.id)) ?? -1;
        if (idx > -1) {
            this.field.insertions?.splice(idx, 1);
        }
        this.field.releases = this.field.releases?.filter(r => String(r.id) !== String(this.release.id));
        this.field.reRenderElement();
    }

    private onIndexChange(index: number) {
        this.index = index;
        const insertion = this.field.insertions?.find(x => x.releaseId === String(this.release.id));
        if (insertion) {
            insertion.index = index;
        }
    }

    getValue(): Insertion {
        return { releaseId: String(this.release.id), index: this.index };
    }
}