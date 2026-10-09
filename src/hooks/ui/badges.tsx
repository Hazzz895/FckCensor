import { JSX } from '@/jsx-runtime'
import { listenAddNodes, listenAddTrackNodes, listenMutations } from './observer'
import addonConfig from '../../../addon.config.mjs'
import { error } from '@/utils/logger'
import styles from '@/styles.module.scss'
import { createNativeBadge, type YandexMusicIconName } from '@pulsesync/addon-sdk'
import { sources } from '@/api/main-api'
import { Q_ALBUM_STICKY_TITLE, Q_ARTIST_STICKY_TITLE, Q_META_TITLE_CONTAINER, Q_PLAYER_BAR, Q_TRACK_ROOT } from './constants'
import { closestInTree, getEntityIdFromNode, getAllTrackNodesById, getTrackIdFromNode } from '@/utils/ui-utils'
import { SpoofableType } from '@/types'
import { onCurrentTrackChange } from '@/utils/pulsesync'
import { getSdkApi } from '@/sdk/lifecycle'

let currentTrackId: string | undefined

const PLAYERBAR_SELECTOR = `${Q_PLAYER_BAR}, [data-test-id="FULLSCREEN_PLAYER_FULLSCREEN_CONTENT"]`

export function prepareBadges() {
    listenAddTrackNodes(el => {
        updateTrackBadge(el, getTrackIdFromNode(el) ?? '')
    }, `:has(${Q_META_TITLE_CONTAINER})`)

    listenAddNodes(el => updateAlbumBadge(el, getEntityIdFromNode(el, 'album') ?? ''), Q_ALBUM_STICKY_TITLE)

    listenAddNodes(el => updateArtistBadge(el, getEntityIdFromNode(el, 'artist') ?? ''), Q_ARTIST_STICKY_TITLE)

    listenAddNodes(updatePlayerBarBadge, PLAYERBAR_SELECTOR)

    listenMutations(mutation => {
        const target = mutation.target instanceof HTMLElement ? mutation.target : mutation.target.parentElement
        const row = target?.closest<HTMLElement>(Q_TRACK_ROOT)
        if (row) updateTrackBadge(row, getTrackIdFromNode(row) ?? '')
    })

    listenMutations(mutation => {
        const target = mutation.target instanceof HTMLElement ? mutation.target : mutation.target.parentElement
        const playerBar = target?.closest<HTMLElement>(PLAYERBAR_SELECTOR)
        if (playerBar) updatePlayerBarBadge(playerBar)
    })

    currentTrackId = undefined
    const api = getSdkApi()
    void api?.player
        .getSnapshot()
        .then(snapshot => {
            if (getSdkApi() !== api) return
            currentTrackId = snapshot.track ? String(snapshot.track.id) : undefined
            updatePlayerBarBadge()
        })
        .catch(error)
    onCurrentTrackChange(track => {
        currentTrackId = track ? String(track.id) : undefined
        try {
            updatePlayerBarBadge()
        } catch (e) {
            error(e)
        }
    })
}

export function updatePlayerBarBadge(playerBar?: HTMLElement) {
    if (!playerBar) {
        const nodes = document.querySelectorAll<HTMLElement>(PLAYERBAR_SELECTOR) ?? undefined
        if (nodes && nodes.length > 0) {
            for (const node of nodes) {
                updatePlayerBarBadge(node)
            }
        }
        return
    }
    if (!playerBar) return
    if (!playerBar.isConnected) return
    return updateTrackBadge(playerBar, currentTrackId ?? '')
}

export function updateTrackBadge(container: HTMLElement, trackId: string) {
    const title = closestInTree(container, Q_META_TITLE_CONTAINER)

    if (!title) return false

    let badge = title.querySelector<HTMLElement>(`.${styles.FckCensorBadge}`)
    const replaced = !!trackId && (sources.hasPlayerReplacement(trackId) || sources.hasTrackSpoof(trackId))
    if (!replaced) {
        badge?.remove()
        return true
    }
    badge ??= <ReplacedBadge type="track" />
    const options = title.querySelector<HTMLElement>('div:has([data-test-id="PLAYERBAR_DESKTOP_CONTEXT_MENU_BUTTON"])')
    // Native marks can mount after our badge during a React rerender.
    if (options) {
        if (badge.nextElementSibling !== options) title.insertBefore(badge, options)
    } else if (title.lastElementChild !== badge) {
        title.appendChild(badge)
    }

    return true
}

function updateAlbumOrArtistBadge(container: HTMLElement, hasSpoof: boolean) {
    const title = closestInTree(container, '.PageHeaderTitle_stickyTitle__CL1m4')

    if (!title) return

    title.querySelector<HTMLElement>(`.${styles.FckCensorBadge}`)?.remove()

    if (hasSpoof) {
        title.style = 'display: flex; align-items: center'
        title.appendChild(<ReplacedBadge type="album" />)
    }
}

export function updateAlbumBadge(container: HTMLElement, albumId: string) {
    updateAlbumOrArtistBadge(container, sources.hasAlbumSpoof(albumId))
}

export function updateArtistBadge(container: HTMLElement, artistId: string) {
    updateAlbumOrArtistBadge(container, sources.hasArtistSpoof(artistId))
}

export function updateBadgesByType(type: SpoofableType, id: string) {
    switch (type) {
        case 'track':
            getAllTrackNodesById(id).forEach(node => updateTrackBadge(node, id))
            break
        case 'album':
            document.querySelectorAll<HTMLElement>(Q_ALBUM_STICKY_TITLE).forEach(el => updateAlbumBadge(el, id))
            break
        case 'artist':
            document.querySelectorAll<HTMLElement>(Q_ARTIST_STICKY_TITLE).forEach(el => updateArtistBadge(el, id))
            break
    }
}

export interface BadgeProps extends JSX.HTMLAttributes {
    icon: string
    description: string
}

export function Badge({ icon, description, ...props }: BadgeProps) {
    const nativeBadge = createNativeBadge({
        icon: icon.replace(/_(xxxs|xxs|xs|s|m|l|xl|xxl|xxxl)$/, '') as YandexMusicIconName,
        label: description,
    })
    return (
        <span {...props} class={styles.FckCensorBadge} style="display: contents" data-fckcensor-badge>
            {nativeBadge}
        </span>
    )
}

export function createMetadataBadge() {
    return <Badge icon="addToPlaylist_xxs" description={'Информация о треке была подменена аддоном ' + addonConfig.name} />
}

export interface ReplacedBadgeProps extends JSX.HTMLAttributes {
    type: SpoofableType
}

export function ReplacedBadge({ type, ...props }: ReplacedBadgeProps) {
    return (
        <Badge
            {...props}
            icon="edit_xxs"
            description={
                (type == 'album' ? 'Альбом' : type == 'artist' ? 'Исполнитель' : type == 'track' ? 'Трек' : '') +
                ' был подменен аддоном ' +
                addonConfig.name
            }
        />
    )
}
