import { JSX, legacyCreateElement } from "@/jsx-runtime";
import { listenAddNodes, listenAddTrackNodes } from "./observer";
import addonConfig from "../../../addon.config.mjs";
import { debug, error } from "@/utils/logger";
import styles from "@/styles.module.scss";
import { eventHandlerForTooltip } from "@/ui/tooltips";
import { sources } from "@/api/main-api";
import { Q_ALBUM_FIBER_ROOT, Q_META_TITLE_CONTAINER, Q_PLAYER_BAR } from "./constants";
import { closestInTree, getAlbumFromNode, getArtistFromNode, getTrackIdFromNode } from "@/utils/ui-utils";
import { SpoofableType } from "@/types";

const PLAYERBAR_SELECTOR = `:is(${Q_PLAYER_BAR}, .FullscreenPlayerDesktopContent_fullscreenContent__Nvety):has(${Q_META_TITLE_CONTAINER})`

export function prepareBadges() {
    listenAddTrackNodes((el) => updateTrackBadge(el, getTrackIdFromNode(el) ?? ""), `:has(${Q_META_TITLE_CONTAINER})`);

    listenAddNodes((el) => updateAlbumBadge(el, String(getAlbumFromNode(el.closest('.PageHeaderBase_content___DNyv')?.querySelector(Q_ALBUM_FIBER_ROOT)!)?.id)), '.CommonAlbumPage_header__jS_be .PageHeaderTitle_stickyTitle__CL1m4')

    listenAddNodes((el) => updateArtistBadge(el, String(getArtistFromNode(el.closest('.ArtistPage_content__iZHVN')!)?.id)), '.ArtistPage_header__tQnNe .PageHeaderTitle_stickyTitle__CL1m4')

    listenAddNodes((el) => {
        updatePlayerBarBadge(el);
    }, PLAYERBAR_SELECTOR);
    updatePlayerBarBadge();
    window?.sonataState?.queueState?.currentEntity?.onChange?.(() => {
        try {
            updatePlayerBarBadge();
        } catch (e) {
            error(e);
        }
    });
}

export function updatePlayerBarBadge(playerBar?: HTMLElement) {
    if (!playerBar) {
        playerBar = document.querySelector<HTMLElement>(PLAYERBAR_SELECTOR) ?? undefined;
    }
    if (!playerBar) return;
    const track = window.pulsesyncApi?.getCurrentTrack();
    if (!track) return;
    updateTrackBadge(playerBar, String(track.id));
}

export function updateTrackBadge(container: HTMLElement, trackId: string) {
    const title = closestInTree(container, Q_META_TITLE_CONTAINER);

    if (!title) return;

    title.querySelector<HTMLElement>(`.${styles.FckCensorBadge}`)?.remove();

    if (sources.hasPlayerReplacement(trackId) || sources.hasTrackSpoof(trackId)) {
        const options = title.querySelector<HTMLElement>('div:has([data-test-id="PLAYERBAR_DESKTOP_CONTEXT_MENU_BUTTON"])');
        if (options) {
            title.insertBefore(<ReplacedBadge type="track"/>, options);
        } else {
            title.appendChild(<ReplacedBadge type="track"/>);
        }
    }
}

function updateAlbumOrArtistBadge(container: HTMLElement, hasSpoof: boolean) {
    const title = closestInTree(container, '.PageHeaderTitle_stickyTitle__CL1m4')

    if (!title) return;

    title.querySelector<HTMLElement>(`.${styles.FckCensorBadge}`)?.remove();

    if (hasSpoof) {
        title.style = "display: flex; align-items: center";
        title.appendChild(<ReplacedBadge type="album"/>)
    }
}

export function updateAlbumBadge(container: HTMLElement, albumId: string) {
    debug(container, albumId)
    updateAlbumOrArtistBadge(container, sources.hasAlbumSpoof(albumId))
}

export function updateArtistBadge(container: HTMLElement, artistId: string) {
    updateAlbumOrArtistBadge(container, sources.hasArtistSpoof(artistId))
}

export interface BadgeProps extends JSX.HTMLAttributes {
    icon: string;
    description: string
}
 
export function Badge({ icon, description, ...props }: BadgeProps) {
    return (
        <span aria-label={description} {...props} class={`Meta_explicitMarkContainer__BxMQg ${styles.FckCensorBadge}`} onmouseenter={eventHandlerForTooltip}>
            <svg class="ExplicitMarkIcon_explicitMark__0BPeQ Meta_explicitMark__ocnCV Rkdd2vKC_3xa1eUdRdHP" 
                 focusable="false" 
                 data-test-id="REPLACE_METADATA_MARK_ICON"
                 aria-hidden="false">
                <use xlink:href={`/icons/sprite.svg#${icon}`}></use>
            </svg>
        </span>
    );
}

export function createMetadataBadge() {
    return <Badge icon="addToPlaylist_xxs" description={"Информация о треке была подменена аддоном " + addonConfig.name}/>
} 

export interface ReplacedBadgeProps extends JSX.HTMLAttributes {
    type: SpoofableType;
}

export function ReplacedBadge({ type, ...props }: ReplacedBadgeProps) {
    return <Badge {...props} icon="edit_xxs" description={(type == "album" ? "Альбом" : type == "artist" ? "Исполнитель" : type == "track" ? "Трек" : "") + " был подменен аддоном " + addonConfig.name}/>
}