import { debug, error, log } from '@/utils/logger'
import { ActionButton, AlertButtons, closeAlert, createScrimAlert, ScrimAlert } from '../../ui/components/alerts/alerts'
import { listenAddTrackNodes } from './observer'
import { Q_DISABLED_TRACK, Q_TRACK_ROOT } from './constants'
import { getDb, localSource } from '@/api/db-api'
import { closestInTree } from '@/utils/ui-utils'
import { completeTutorial, DISABLED_TRACK_TUTORIAL } from './tutorial'
import { createTrackSpoofAlertFor } from '@/ui/components/alerts/spoof/spoof-alert'

import { getSdkApi } from '@/sdk/lifecycle'

export function prepareDisabledTracksObserver() {
    const seen = new WeakSet<HTMLElement>()
    listenAddTrackNodes((el, trackId) => {
        if (seen.has(el)) return
        seen.add(el)
        function onClick(ev: Event) {
            if (!(ev instanceof MouseEvent)) return
            onDisabledTrackClick(ev, String(trackId))
        }
        getSdkApi()?.listen(el, 'click', onClick)
    }, Q_DISABLED_TRACK)
}

function onDisabledTrackClick(ev: MouseEvent, trackId: string) {
    const el = ev.target
    if (!(el instanceof HTMLElement)) return

    const trackNode = closestInTree<HTMLElement>(el, Q_TRACK_ROOT)
    if (!trackNode || !trackNode.classList.contains(Q_DISABLED_TRACK.slice(1))) return

    void createTrackSpoofAlertFor(trackNode, trackNode).catch(error)
    completeTutorial(DISABLED_TRACK_TUTORIAL)
}
