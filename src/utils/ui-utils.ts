import { getSdkApi } from '@/sdk/lifecycle'
import { requestSdkSync, flushSdk, rememberResponse } from '@/sdk/bridge'
import { SpoofableEntity, SpoofableType } from '@/types'
import { getEntityCoverUri, httpsify } from './common'
import { Q_ARTIST_FIBER_ROOT, Q_ALBUM_FIBER_ROOT, Q_TRACK_FIBER_ROOT } from '@/hooks/ui/constants'
import { notifications, NotificationOptions } from '@pulsesync/addon-sdk'

function entityIdFromUrl(url: URL, type: SpoofableType): string | null {
    const path = url.pathname.replace(/\/$/, '')
    if (path === `/${type}` || (path === '/album/track' && type !== 'artist')) {
        const id = url.searchParams.get(`${type}Id`)
        if (id) return id
    }
    const match = new RegExp(`/${type}/([^/?#]+)`).exec(path)
    return match && match[1] !== 'track' ? decodeURIComponent(match[1]) : null
}

export function getEntityIdFromNode(node: HTMLElement | null | undefined, type: SpoofableType): string | null {
    if (!node) return null
    const track = type === 'track' ? closestInTree(node, '[data-pulsesync-track-id]') : null
    if (track?.getAttribute('data-pulsesync-track-id')) return track.getAttribute('data-pulsesync-track-id')
    if (type !== 'track') {
        const id = entityIdFromUrl(new URL(location.href), type)
        if (id) return id
    }
    for (const link of node.querySelectorAll<HTMLAnchorElement>('a[href]')) {
        const id = entityIdFromUrl(new URL(link.href, location.href), type)
        if (id) return id
    }
    return null
}
export function getTrackIdFromNode(node: HTMLElement): string | null {
    return getEntityIdFromNode(node, 'track')
}

export function getAllTrackNodesById(trackId: string): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>(Q_TRACK_FIBER_ROOT)).filter(node => getTrackIdFromNode(node) === trackId)
}

export function getAllAlbumNodesById(albumId: string): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>(Q_ALBUM_FIBER_ROOT)).filter(node => getEntityIdFromNode(node, 'album') === albumId)
}

export function getAllArtistNodesById(artistId: string): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>(Q_ARTIST_FIBER_ROOT)).filter(node => getEntityIdFromNode(node, 'artist') === artistId)
}

export function getEntityNodesById(type: SpoofableType, id: string): HTMLElement[] {
    switch (type) {
        case 'track':
            return getAllTrackNodesById(id)
        case 'album':
            return getAllAlbumNodesById(id)
        case 'artist':
            return getAllArtistNodesById(id)
    }
}

export async function spoofAllNodesFor(_type: SpoofableType, _id: string) {
    rememberResponse({ id: _id }, _type)
    requestSdkSync()
    await flushSdk()
}

export function closestInTree<T extends Element = HTMLElement>(node: Element, selector: string) {
    return node.closest<T>(selector) || node.querySelector<T>(selector)
}

export function getContextMenuSource(menu: HTMLElement, targetQ: string) {
    const id = menu.closest<HTMLElement>('[aria-labelledby]')?.getAttribute('aria-labelledby')
    return id ? (document.getElementById(id)?.closest<HTMLElement>(targetQ) ?? null) : null
}

export const DUMMY_ELEMENT = document.createElement('div')

export async function showNotificationSafe(message: string, kind: 'info' | 'error' = 'info', data?: NotificationOptions, attempt = 1): Promise<void> {
    const api = getSdkApi()
    if (!api || api.signal.aborted) return
    try {
        await (kind === 'error' ? notifications.error : notifications.info)(message, data)
    } catch (e) {
        if (attempt < 3 && e instanceof Error && e.message === 'Native notification containers are not mounted') {
            const timer = setTimeout(() => void showNotificationSafe(message, kind, data, attempt + 1), attempt * 1250)
            api.onCleanup(() => clearTimeout(timer))
        }
    }
}

export async function showNotificationWithCover(
    entity: SpoofableEntity,
    message: string,
    kind: 'info' | 'error',
    data?: { icon?: any; coverUrl?: string; link?: { href: string; label: string }; durationMs?: number },
) {
    let coverUri = getEntityCoverUri(entity)
    if (!coverUri) return
    coverUri = httpsify(coverUri).replace('%%', '100x100')

    await showNotificationSafe(message, kind, { ...data, coverUrl: coverUri })
}
