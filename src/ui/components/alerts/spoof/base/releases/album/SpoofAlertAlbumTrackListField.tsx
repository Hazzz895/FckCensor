import { Album, Release, Track } from '@/types'
import { SpoofAlertReleasesListField } from '../SpoofAlertReleasesListField'
import { SpoofAlertBase } from '../../SpoofAlertBase'
import { ReleaseNode } from '../ReleaseNode'
import ElementWrap from '@/ui/components/ElementWrap'
import { IGetValue } from '@/ui/components/IGetValue'
import { getAlbumTracks, getTracks } from '@/utils/music'
import { debug, error } from '@/utils/logger'
import { sources } from '@/api/main-api'
import { cloneEntity } from '@/utils/common'
import { ActionButton } from '@/ui/components/alerts/alerts'
import { AddSpoofAlertFieldButton } from '../../SpoofAlertCustomPropertyField'

export class SpoofAlertAlbumTrackListField extends SpoofAlertReleasesListField<Track[]> {
    public constructor(alert: SpoofAlertBase) {
        super(alert, 'Треки альбома', 'track')
        const originalVolumes = alert.getOriginalValue('volumes') as Track[][] | undefined
        for (const track of originalVolumes?.flat() ?? []) {
            this.trackMetadata.set(String(track.id), cloneEntity(track))
        }
    }

    public tracks?: Track[][] | null
    private readonly trackMetadata = new Map<string, Track>()
    private readonly requestedTrackIds = new Set<string>()

    public getDisplayTrack(track?: Track): Track | undefined {
        if (!track) return undefined
        const display = cloneEntity(this.trackMetadata.get(String(track.id)) ?? track)
        sources.spoofTrack(display)
        return display
    }

    private loadTrackMetadata() {
        const ids = [...new Set(this.tracks?.flat().map(track => String(track.id)) ?? [])].filter(
            id => !this.requestedTrackIds.has(id) && !this.getDisplayTrack({ id } as Track)?.title,
        )
        if (!ids.length) return
        ids.forEach(id => this.requestedTrackIds.add(id))
        void getTracks(...ids)
            .then(tracks => {
                for (const track of tracks) this.trackMetadata.set(String(track.id), cloneEntity(track))
                this.reRenderElement()
            })
            .catch(error)
    }

    protected fillElements(): DiskNode[] {
        if (this.tracks === undefined) this.tracks = this.alert.album.volumes
        if (this.tracks === undefined) {
            getAlbumTracks(this.alert.album.id)
                .then(a => {
                    try {
                        this.tracks = a?.volumes ?? null
                    } catch {
                        this.tracks = null
                    } finally {
                        this.reRenderElement()
                    }
                })
                .catch(err => {
                    this.tracks = null
                    error(err)
                    this.reRenderElement()
                })
            return [new DiskNode(this, Array(this.alert.album.trackCount).fill(undefined), 0, undefined)]
        } else if (this.tracks == null) {
            return []
        } else {
            for (const track of this.tracks.flat()) {
                if (track.title) this.trackMetadata.set(String(track.id), cloneEntity(track))
            }
            this.loadTrackMetadata()
            return this.tracks.map((v, i) => new DiskNode(this, v, i, this.tracks!.length > 1 ? i : undefined))
        }
    }

    public getValue() {
        return (this.releaseNodes as DiskNode[]).map(node => node.getValue().map(x => ({ id: x.id }) as Track)).filter(x => x.length > 0)
    }

    protected getAdditionalActionButton(): HTMLElement | undefined {
        return <AddSpoofAlertFieldButton onclick={this.onAddDiskClick.bind(this)}>Добавить диск</AddSpoofAlertFieldButton>
    }

    private onAddDiskClick() {
        this.tracks?.push([])
        this.reRenderElement()
    }

    protected onReleaseAdd(track: Track): void {
        if (!this.tracks) return
        this.tracks[this.tracks.length - 1].push(track)
    }

    public moveTrack(diskIndex: number, trackIndex: number, delta: number) {
        if (!this.tracks) return
        const disk = this.tracks[diskIndex]
        if (!disk) return

        const targetIndex = trackIndex + delta
        const [track] = disk.splice(trackIndex, 1)

        if (targetIndex >= 0 && targetIndex <= disk.length) {
            disk.splice(targetIndex, 0, track)
        } else if (targetIndex < 0) {
            const prevDisk = this.tracks[diskIndex - 1]
            if (prevDisk) {
                prevDisk.push(track)
            } else {
                disk.splice(trackIndex, 0, track)
            }
        } else {
            const nextDisk = this.tracks[diskIndex + 1]
            if (nextDisk) {
                nextDisk.unshift(track)
            } else {
                disk.splice(trackIndex, 0, track)
            }
        }

        this.reRenderElement()
    }

    hasDiffs(prop: Track[][]): boolean {
        return (
            prop.map(d => d.map(t => t.id).join(',')).join('|') !=
            (this.originalValue ?? ([] as Track[][])).map(d => d.map(t => t.id).join(',')).join('|')
        )
    }
}

export class DiskNode extends ElementWrap implements IGetValue<Track[]> {
    public constructor(
        private readonly field: SpoofAlertAlbumTrackListField,
        private readonly disk: (Track | undefined)[],
        private readonly diskIndex: number,
        private readonly displayIndex?: number,
    ) {
        super()
    }

    protected createElement(): HTMLElement {
        const header =
            this.displayIndex !== undefined ? (
                <div class="TextVolume_root__wxSaK">
                    <h2 class="_MWOVuZRvUQdXKTMcOPx _sd8Q9d_Ttn0Ufe4ISWS nSU6fV9y80WrZEfafvww CommonAlbumPage_text__kqBSb">
                        Диск {this.displayIndex + 1}
                    </h2>
                </div>
            ) : undefined
        const totalDisks = this.field.tracks?.length ?? 1
        return (
            <div style="width: 100%">
                {header}
                {this.disk.map((t, i) => (
                    <ReleaseNode
                        onIndexChange={delta => this.field.moveTrack(this.diskIndex, i, delta)}
                        onremove={() => {
                            this.disk.splice(i, 1)
                            this.reRenderElement()
                        }}
                        release={this.field.getDisplayTrack(t)}
                        disableUp={this.diskIndex === 0 && i === 0}
                        disableDown={this.diskIndex === totalDisks - 1 && i === this.disk.length - 1}
                    />
                ))}
            </div>
        )
    }

    public getValue(): Track[] {
        return this.disk as any
    }
}
