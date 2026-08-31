import { debug, error, log } from "@/utils/logger";
import { ActionButton, AlertButtons, closeAlert, createScrimAlert, ScrimAlert } from "../../ui/components/alerts/alerts";
import { listenAddTrackNodes } from "./observer";
import { Q_DISABLED_TRACK, Q_TRACK_ROOT } from "./constants";
import { getDb, localSource } from "@/api/db-api";
import { closestInTree, getTrackFromNode, spoofTrackNode } from "@/utils/ui-utils";
import { completeTutorial, DISABLED_TRACK_TUTORIAL } from "./tutorial";
import { createTrackSpoofAlertFor } from "@/ui/components/alerts/spoof/spoof-alert";

export function prepareDisabledTracksObserver() {
    listenAddTrackNodes((el, trackId) => {
        function onClick(ev: MouseEvent) {
            onDisabledTrackClick(ev, String(trackId));
        }
        el.addEventListener('click', onClick)
    }, Q_DISABLED_TRACK)
}  

function onDisabledTrackClick(ev: MouseEvent, trackId: string) {
    const el = ev.target
    if (!(el instanceof HTMLElement)) return;

    const trackNode = closestInTree<HTMLElement>(el, Q_TRACK_ROOT);
    if (!trackNode || !trackNode.classList.contains(Q_DISABLED_TRACK.slice(1))) return;

    createTrackSpoofAlertFor(trackNode, trackNode);
    completeTutorial(DISABLED_TRACK_TUTORIAL);
}