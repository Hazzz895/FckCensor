import { getTracks } from '@/utils/music'
import { JSX } from '@/jsx-runtime'
import { TrackMST, Artist, Album, Track, SpoofableType } from '@/types'
import { getTrackIdFromNode } from '@/utils/ui-utils'
import { debug } from '@/utils/logger'
import { SpoofTrackAlert } from './track/SpoofTrackAlert'
import { SpoofArtistAlert } from './artist/SpoofArtistAlert'
import { SpoofAlbumAlert } from './album/SpoofAlbumAlert'
import { localizeSpoofableType } from '@/utils/common'
import addonConfig from '@/../addon.config.mjs'
import { modals } from '@pulsesync/addon-sdk'

function getScrim() {
    const pulsesyncAddonMenuItems = document.querySelectorAll('body > [data-floating-ui-portal] div[data-test-id$=_CONTEXT_MENU] > [data-pulsesync-addon-menu-item]');
    debug('pulsesyncAddonMenuItems', pulsesyncAddonMenuItems)
    for (const item of pulsesyncAddonMenuItems) {
        if (item.querySelector('span')?.textContent.startsWith('Подменить')) {
            return item as HTMLElement;
        }
    }
    return undefined;
}

export async function createTrackSpoofAlertFor(scrim?: HTMLElement, trackNode?: HTMLElement, trackData?: Track | null) {
    if (trackData === undefined) {
        const id = trackNode ? getTrackIdFromNode(trackNode) : null
        trackData = id ? ((await getTracks(id))[0] ?? null) : null
    }

    if (scrim === undefined) {
        scrim = getScrim()
    }

    if (trackData !== null) {
        return new SpoofTrackAlert(trackData, scrim)
    }

    showNoDataError('track')
}

export function createArtistSpoofAlertFor(scrim?: HTMLElement, artistData?: Artist | null) {
    if (scrim === undefined)  {
        scrim = getScrim()
    }

    if (artistData) {
        return new SpoofArtistAlert(artistData, scrim)
    }

    showNoDataError('artist')
}

export function createAlbumSpoofAlertFor(scrim?: HTMLElement, albumData?: Album | null) {
    if (scrim === undefined) {
        scrim = getScrim()
    }

    if (albumData) {
        return new SpoofAlbumAlert(albumData, scrim)
    }

    showNoDataError('album')
}

function showNoDataError(type: SpoofableType) {
    modals.alert({
        title: 'Ой!',
        message:
            localizeSpoofableType(type) +
            ' не найден... Скорее всего, это ошибка на стороне аддона, сообщите об этом в ветке аддона в дискорде. А сейчас стоит попытаться открыть это окно в другом месте.',
    })
}

export interface CoverProps extends JSX.HTMLAttributes {
    src?: string
    mini?: boolean
}
