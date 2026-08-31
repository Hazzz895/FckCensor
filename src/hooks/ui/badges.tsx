import { JSX, legacyCreateElement } from "@/jsx-runtime";
import { listenAddNodes, listenAddTrackNodes } from "./observer";
import addonConfig from "../../../addon.config.mjs";
import { debug, error } from "@/utils/logger";
import styles from "@/styles.module.scss";
import { eventHandlerForTooltip } from "@/ui/tooltips";
import { sources } from "@/api/main-api";
import { Q_META_TITLE_CONTAINER, Q_PLAYER_BAR } from "./constants";
import { closestInTree, getTrackIdFromNode } from "@/utils/ui-utils";

const PLAYERBAR_SELECTOR = `:is(${Q_PLAYER_BAR}, .FullscreenPlayerDesktopContent_fullscreenContent__Nvety):has(${Q_META_TITLE_CONTAINER})`

export function prepareBadges() {
    listenAddTrackNodes(onTrackNodeAdded, `:has(${Q_META_TITLE_CONTAINER})`);

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
    onTrackNodeAdded(playerBar, String(track.id));
}

export function updateBadgeInTrackNode(trackNode: HTMLElement) {
    const trackId = getTrackIdFromNode(trackNode);
    if (!trackNode || !trackId) return
    onTrackNodeAdded(trackNode, String(trackId))
}

function onTrackNodeAdded(container: HTMLElement, trackId: string) {
    const title = closestInTree(container, Q_META_TITLE_CONTAINER);

    if (!title) return;

    title.querySelector<HTMLElement>(`.${styles.FckCensorBadge}`)?.remove();

    if (sources.hasPlayerReplacement(trackId) || sources.hasTrackSpoof(trackId)) {
        const options = title.querySelector<HTMLElement>('div:has([data-test-id="PLAYERBAR_DESKTOP_CONTEXT_MENU_BUTTON"])');
        if (options) {
            title.insertBefore(createReplacedBadge(), options);
        } else {
            title.appendChild(createReplacedBadge());
        }
    }
}

export interface BadgeProps extends JSX.HTMLAttributes {
    icon: string;
    description: string
}
 
export function Badge({ icon, description }: BadgeProps) {
    return (
        <span aria-label={description} class={`Meta_explicitMarkContainer__BxMQg ${styles.FckCensorBadge}`} onmouseenter={eventHandlerForTooltip}>
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

export function createReplacedBadge() {
    return <Badge icon="edit_xxs" description={"Трек был подменен аддоном " + addonConfig.name}/>
}