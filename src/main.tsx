import { defineAddon, notifications } from '@pulsesync/addon-sdk'
import addonConfig from '../addon.config.mjs'
import '@/ym_styles.scss'
import '@/styles.module.scss'
import './api/reports-api'
import { debug, error } from './utils/logger'
import { loadSources } from './api/main-api'
import { localSource } from './api/db-api'
import { destroyObserver, invokeAddNodesListeners, startObserver } from './hooks/ui/observer'
import { prepareBadges } from './hooks/ui/badges'
import { prepareTutorials } from './hooks/ui/tutorial'
import { prepareOptions, trackMenuItems, albumMenuItems } from './hooks/ui/options'
import { prepareDisabledTracksObserver } from './hooks/ui/disabled-tracks'
import { prepareSettingsOptions } from './hooks/ui/settings'
import { settings } from './settings'
import { startSdkBridge, requestSdkSync, flushSdk } from './sdk/bridge'
import { hookResources, stopResourceHooks, toggleLiteMode } from './hooks/resources'

export default defineAddon({
    id: addonConfig.id,
    name: addonConfig.name,
    settings,
    trackMenuItems,
    albumMenuItems,
    start: async api => {
        debug('Starting')
        let stopBridge: (() => void) | undefined
        let unsubscribeSettings: (() => void) | undefined
        let stopped = false
        const cleanup = () => {
            if (stopped) return
            stopped = true
            api.signal.removeEventListener('abort', cleanup)
            unsubscribeSettings?.()
            destroyObserver()
            stopResourceHooks()
            stopBridge?.()
            localSource.releasePlayerUrls()
        }
        api.signal.addEventListener('abort', cleanup, { once: true })
        try {
            api.signal.throwIfAborted()
            stopBridge = await startSdkBridge(api)
            if (api.signal.aborted) {
                stopBridge()
                throw new Error('Addon startup cancelled')
            }
            let liteMode = settings.store.liteMode
            unsubscribeSettings = api.settings.onChange(() => {
                const next = settings.store.liteMode
                if (next === liteMode || stopped) return
                liteMode = next
                void toggleLiteMode(next).catch(error)
            })
            await hookResources()
            api.signal.throwIfAborted()
            startObserver()
            prepareBadges()
            prepareTutorials()
            prepareOptions()
            prepareDisabledTracksObserver()
            prepareSettingsOptions()
            await loadSources()
            if (api.signal.aborted) throw new Error('Addon startup cancelled')
            requestSdkSync()
            await flushSdk()
            api.signal.throwIfAborted()
            invokeAddNodesListeners()
            return cleanup
        } catch (e) {
            cleanup()
            if (!api.signal.aborted) {
                error(e)
                void notifications.error(`Не удалось запустить аддон ${addonConfig.name}. Подробности в консоли.`)
            }
            throw e
        }
    },
})
