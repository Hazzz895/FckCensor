import { debug, error } from './utils/logger'
import { loadSources } from './api/main-api'
import '@/ym_styles.scss'
import '@/styles.module.scss'
import { destroyObserver, invokeAddNodesListeners } from './hooks/ui/observer'
import { prepareBadges } from './hooks/ui/badges'
import { prepareTutorials } from './hooks/ui/tutorial'
import { prepareOptions } from './hooks/ui/options'
import { prepareDisabledTracksObserver } from './hooks/ui/disabled-tracks'
import { hookPlayer } from './hooks/player'
import './api/reports-api'
import './utils/hook-utils'
import { prepareSettingsOptions } from './hooks/ui/settings'
import { defineAddon, notifications } from '@pulsesync/addon-sdk'
import addonConfig from '../addon.config.mjs'
import { settings } from './settings'
import { unhookAllMethods } from './utils/hook-utils'

function prepareUiHooks() {
    prepareBadges()
    prepareTutorials()
    prepareOptions()
    prepareDisabledTracksObserver()
    prepareSettingsOptions()
    //prepeareButtons();
}

function prepareHooks() {
    hookPlayer()
    prepareUiHooks()
}

function cleanup() {
    destroyObserver()
    unhookAllMethods()
}

export default defineAddon({
    id: addonConfig.id,
    name: addonConfig.name,
    settings,
    start: async api => {
        debug('Starting')

        try {
            prepareHooks()
            await loadSources()
            invokeAddNodesListeners()
        } catch (e) {
            error(e)
            notifications.error(`Не удалось запустить аддон ${addonConfig.name}. Подробности в консоли.`)
        }

        return cleanup
    },
})
