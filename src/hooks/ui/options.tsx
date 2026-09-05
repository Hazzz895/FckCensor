import { JSX } from "@/jsx-runtime";
import { listenAddNodes } from "./observer";
import { getAlbumFromNode, getArtistFromNode, getContextMenuSource, getTrackFromNode, walkFiber } from "@/utils/ui-utils";
import { debug, error } from "@/utils/logger";
import { Album, Artist, OuterArtist, TrackMST } from "@/types";
import { createAlbumSpoofAlertFor, createArtistSpoofAlertFor, createTrackSpoofAlertFor } from "@/ui/components/alerts/spoof/spoof-alert";
import { Q_TRACK_ROOT } from "./constants";
import { completeTutorial, SPOOF_TUTORIAL } from "./tutorial";

export function prepareOptions() {
    listenAddOptionsMenu((trackOptionsMenu) => {
        const trackData = walkFiber<TrackMST>(trackOptionsMenu, (obj) => {
            if (!Array.isArray(obj)) {
                return obj?.props?.track;
            }
            
            for (const o of obj) {
                if (o?.props?.track) {
                    return o.props.track;
                }
            }
        });
        if (!trackData) return;
        const trackNode = getContextMenuSource(trackOptionsMenu, Q_TRACK_ROOT);
        const beforeItem = trackOptionsMenu.querySelector<HTMLElement>('[data-test-id="CONTEXT_MENU_DOWNLOAD_BUTTON"]')
        const option = <SpoofOption label="Подменить трек" onclick={(el: HTMLElement) => createTrackSpoofAlertFor(el, trackNode, trackData)}/>
        if (beforeItem) {
            beforeItem.parentElement?.insertBefore(option, beforeItem);
        }
        else {
            trackOptionsMenu.appendChild(option);
        }
    }, "track");

    listenAddOptionsMenu((artistOptionsMenu) => {
        const artistHeaderRoot = getContextMenuSource(artistOptionsMenu, '.ArtistPage_content__iZHVN');
        if (!artistHeaderRoot) return;
        const artistData = getArtistFromNode(artistHeaderRoot);
        if (!artistData) return;
        const option = <SpoofOption label="Подменить артиста" onclick={(el: HTMLElement) => createArtistSpoofAlertFor(el, artistData)}/>
        artistOptionsMenu.appendChild(option)
    }, "artist")

    listenAddOptionsMenu((albumOptionsMenu) => {
        const albumControlsRoot = getContextMenuSource(albumOptionsMenu, '.CommonPageHeader_controls__c27E_');
        if (!albumControlsRoot) return;
        const albumData = getAlbumFromNode(albumControlsRoot);
        if (!albumData) return;
        const option = <SpoofOption label="Подменить альбом" onclick={(el: HTMLElement) => createAlbumSpoofAlertFor(el, albumData)}/>
        albumOptionsMenu.appendChild(option)
    }, "album")
}

function listenAddOptionsMenu(listener: (el: HTMLElement) => void, type: "artist" | "track" | "album") {
    listenAddNodes(listener, `[data-test-id="${type.toUpperCase()}_CONTEXT_MENU"]:not(:has([fckcensoroption]))`)
}

export interface OptionAttributes extends JSX.HTMLAttributes {
    label: string;
    icon: string;
    onclick?: (ev: MouseEvent) => void;
}

function SpoofOption({ label, onclick, ...props }: any) {
    return <Option label={label} onclick={(ev) => onclick(ev.currentTarget)} icon="edit_xxs" {...props}/>
}

export function Option({ label, icon, onclick}: OptionAttributes) {
    return (
    <button onclick={(ev: MouseEvent) => { completeTutorial(SPOOF_TUTORIAL); onclick && onclick(ev); }} fckcensoroption class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr qU2apWBO1yyEK0lZ3lPO kc5CjvU5hT9KEj0iTt3C EiyUV4aCJzpfNzuihfMM" type="button" role="menuitem" data-test-id="CONTEXT_MENU_SPOOF_BUTTON" tabindex="-1" aria-live="off" aria-busy="false">
        <span class="JjlbHZ4FaP9EAcR_1DxF">
            <svg class="J9wTKytjOWG73QMoN5WP elJfazUBui03YWZgHCbW vqAVPWFJlhAOleK_SLk4 l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
                <use xlink:href={`/icons/sprite.svg#${icon}`}></use>
            </svg>
            {label}
        </span>
    </button>)
}