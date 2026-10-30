import { JSX } from '@/jsx-runtime'
import { Artist } from '@/types'
import ElementWrap from '@/ui/components/ElementWrap'
import { searchArtists } from '@/utils/music'
import { debug } from '@/utils/logger'
import { Cover } from '../../../../Cover'
import styles from '@/styles.module.scss'
import { eventHandlerForTooltip, removeTooltip } from '@/ui/tooltips'
import { Searchable } from '@/ui/components/Searchable'
import { SpoofAlertArtistsField } from './SpoofAlertArtistsField'
import { allocateCustomEntityId } from '../../custom-entities/custom-entity-id-counter'
import { getLocalArtists, isCustomArtistId, isStoredLocalArtist, normalizeArtistName } from '../../custom-entities/custom-entity-artists'

export interface TabbedArtistProps extends JSX.HTMLAttributes {
    artist?: Artist
}

export class TabbedArtist extends Searchable<Artist> {
    private readonly onChanged?: (removed: boolean) => void

    private textEntity?: Artist
    private ownId?: string

    constructor(
        private readonly field: SpoofAlertArtistsField,
        artist?: Artist,
        onChanged?: (removed: boolean) => void,
    ) {
        super('artist', () => onChanged?.(false))
        this.entity = artist
        this.onChanged = onChanged
    }

    getArtist(): Artist | null {
        if (this.entity) return this.entity
        const name = this.input?.value.trim()
        return name ? this.resolveFromText(name) : null
    }

    getNewLocalArtist(): Artist | null {
        const artist = this.entity
        return artist && artist === this.textEntity && isCustomArtistId(artist.id) && !isStoredLocalArtist(artist.id) ? artist : null
    }

    protected getAdditionalSearchResults(query: string): Artist[] {
        const normalizedQuery = normalizeArtistName(query)
        return getLocalArtists().filter(artist => normalizeArtistName(artist.name).includes(normalizedQuery))
    }

    protected isAdditionalSearchResult(artist: Artist): boolean {
        return isStoredLocalArtist(artist.id)
    }

    private resolveFromText(name: string): Artist {
        const existing = this.field.findLocalArtistByName(name, this)
        const artist: Artist = existing
            ? { id: String(existing.id), name: existing.name }
            : { id: (this.ownId ??= String(allocateCustomEntityId())), name }
        this.entity = this.textEntity = artist
        return artist
    }

    createElement(): HTMLElement {
        let children: JSX.Child = []
        if (this.entity) {
            children = [
                <Cover
                    mini
                    style="width: 24px; height: 24px; margin-right: 4px; border-radius: 100%"
                    src={this.entity.coverUri ?? this.entity.ogImage ?? this.entity.cover?.uri}
                />,
                this.entity.name,
            ]
        } else {
            children = super.createElement()
        }

        return (
            <div
                aria-label="Нажмите чтобы удалить исполнителя"
                onmouseenter={(ev: MouseEvent) => !this.input && eventHandlerForTooltip(ev)}
                class={styles.TabbedArtist}
            >
                {children}
            </div>
        )
    }

    protected onFocusLost(ev: FocusEvent) {
        super.onFocusLost(ev)
        const name = this.input?.value.trim()
        if (!name) {
            this.element.remove()
            this.onChanged?.(true)
        } else if (!this.entity) {
            this.resolveFromText(name)
            this.onChanged?.(false)
        } else if (this.input && this.entity === this.textEntity && normalizeArtistName(name) !== normalizeArtistName(this.entity.name)) {
            this.resolveFromText(name)
            this.onChanged?.(false)
        }
    }
}
