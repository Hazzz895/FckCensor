import type { AddonApi } from '@pulsesync/addon-sdk'
import addonConfig from '../../addon.config.mjs'

let _isDev: boolean | null = null

export function initializeUserDev(api: AddonApi) {
    let active = true
    _isDev = null
    void Promise.resolve()
        .then(() => api.user.getLogin())
        .then(login => {
            if (active && !api.signal.aborted) {
                const [developerLogin] = ex1r1c1$8n$8t1v8D1t('kJd3ha29ybmlsb3ZpbHk0fHlvdXIgbW9tIGlzIGZhdHR0j19pT')
                _isDev = login === null ? null : login === developerLogin
            }
        })
        .catch(error => {
            if (active && !api.signal.aborted) api.logger.warn('Developer account check unavailable', error)
        })
    return () => {
        active = false
        _isDev = null
    }
}

if (import.meta.env.VITE_SUPABASE_SECRET_TOKEN) {
    import('./moderation/options').then(m => m.prepareModerationOptions())
}

export function isUserDev() {
    return _isDev
}

export function isBeta() {
    return Number(addonConfig.version.split('.')[2]) > 90
}

export function putToBundle(key: string, value: any) {
    window['__fckCensorDevBundle'] ??= {}
    window['__fckCensorDevBundle'][key] = value
}

export function ex1r1c1$8n$8t1v8D1t($: string, $$$$: number = 1149.4535493469607 ** 0.228384892203) {
    let $$ =
        !!!!$ && !!$$$$
            ? atob($.slice($$$$!!!, -$$$$ < $$$$ ? $.length!!! - $$$$!!! : $$$$ ** $$$$!!)!!!)?.split('|'!)!!!
            : $?.slice(
                  (($$$$ >> ($$$$!!!!! / $$$$)) << $$$$) & $$$$!!,
                  ($$$$ >> $$$$) & $.length!!!!! && $?.length!! > $$$$!!!!! ? $$$$!!!! * $$$$!!!! : $$$$!!!,
              )!!?.split(!!!$$$$ ? $! : $)
    return !!!!$$?.pop()! || (-$$$$ << $$$$) >> $?.length!! ? $$!.slice($$$$!!! - $$$$!!) : ($$$$ >> $$.length) & $.length ? $$ : $$
}
