import { JSX } from '@/jsx-runtime'
import { listenAddNodes } from './observer'
import { getEntityIdFromNode, getContextMenuSource } from '@/utils/ui-utils'
import { createAlbumSpoofAlertFor, createArtistSpoofAlertFor, createTrackSpoofAlertFor } from '@/ui/components/alerts/spoof/spoof-alert'
import type { TrackMenuItem, AlbumMenuItem } from '@pulsesync/addon-sdk'
import { getTracks, getAlbumTracks, getArtist } from '@/utils/music'

async function editTrack(id: string) {
    const [track] = await getTracks(id)
    createTrackSpoofAlertFor(undefined, undefined, track ?? null)
}
export async function editAlbum(id: string) {
    createAlbumSpoofAlertFor(undefined, await getAlbumTracks(id))
}
export const trackMenuItems: TrackMenuItem[] = [
    {
        id: 'spoof-track',
        label: 'Подменить трек',
        icon: 'edit',
        position: 3,
        onClick: ({ track }) => editTrack(track.id),
    },
]
export const albumMenuItems: AlbumMenuItem[] = [
    {
        id: 'spoof-album',
        label: 'Подменить альбом',
        icon: 'edit',
        position: 3,
        onClick: ({ album }) => editAlbum(album.id),
    },
]
export function prepareOptions() {
    listenAddOptionsMenu(artistOptionsMenu => {
        const artistHeaderRoot = getContextMenuSource(artistOptionsMenu, '.ArtistPage_content__iZHVN')
        if (!artistHeaderRoot) return
        const artistId = getEntityIdFromNode(artistHeaderRoot, 'artist')
        if (!artistId) return
        const option = (
            <SpoofOption
                label="Подменить исполнителя"
                onclick={async (el: HTMLElement) => createArtistSpoofAlertFor(el, await getArtist(artistId))}
            />
        )
        const nextItem = artistOptionsMenu.querySelectorAll('[role="menuitem"]')[3]
        if (nextItem) nextItem.before(option)
        else artistOptionsMenu.appendChild(option)
    }, 'artist')
}

function listenAddOptionsMenu(listener: (el: HTMLElement) => void, type: 'artist' | 'track' | 'album') {
    listenAddNodes(listener, `[data-test-id="${type.toUpperCase()}_CONTEXT_MENU"]:not(:has([fckcensoroption]))`)
}

export interface OptionAttributes extends JSX.HTMLAttributes {
    label: string
    icon: string
    onclick?: (ev: MouseEvent) => void
}

function SpoofOption({ label, onclick, ...props }: any) {
    return <Option label={label} onclick={ev => onclick(ev.currentTarget)} icon="edit_xxs" {...props} />
}

export function Option({ label, icon, onclick }: OptionAttributes) {
    return (
        <button
            onclick={onclick}
            fckcensoroption
            class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr qU2apWBO1yyEK0lZ3lPO kc5CjvU5hT9KEj0iTt3C EiyUV4aCJzpfNzuihfMM"
            type="button"
            role="menuitem"
            data-test-id="CONTEXT_MENU_SPOOF_BUTTON"
            tabindex="-1"
            aria-live="off"
            aria-busy="false"
        >
            <span class="JjlbHZ4FaP9EAcR_1DxF">
                <svg class="J9wTKytjOWG73QMoN5WP elJfazUBui03YWZgHCbW vqAVPWFJlhAOleK_SLk4 l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
                    <use xlink:href={`/icons/sprite.svg#${icon}`}></use>
                </svg>
                {label}
            </span>
        </button>
    )
}
