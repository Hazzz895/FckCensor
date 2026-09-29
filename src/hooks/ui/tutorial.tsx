import {
    listenAddNodes,
    listenAddTrackNodes,
    listenRemovedNodes,
    unlistenAddNodes,
    unlistenRemovedNodes
} from "./observer"
import { ClosableTooltip, removeTooltip } from "@/ui/tooltips"
import styles from "@/styles.module.scss"
import { Q_DISABLED_TRACK } from "./constants"
import { JSX } from "@/jsx-runtime"
import addonConfig from "../../../addon.config.mjs"
import { debug } from "@/utils/logger"

export const DISABLED_TRACK_TUTORIAL = "DISABLED_TRACK_TUTORIAL"
export const LITE_MODE_WARNING = "LITE_MODE_WARNING"
export const SPOOF_TUTORIAL = "SPOOF_TUTORIAL"

export function createDisabledTrackTutorialTooltip() {
    const tooltip = <TutorialTooltip id={DISABLED_TRACK_TUTORIAL}>{`Этот трек был удалён и стал недоступен для прослушивания. Нажмите на трек, чтобы запустить процесс его восстановления через аддон ${addonConfig.name}`}</TutorialTooltip>
    
    if (styles.DisabledTrack_TutorialTooltip) {
        tooltip.classList.add(styles.DisabledTrack_TutorialTooltip)
    }
    document.body.appendChild(tooltip)
    return tooltip
}

export function TutorialTooltip({ children, id, ...props }: { children: JSX.Child, id: string } & JSX.HTMLAttributes) {
    return <ClosableTooltip id={id} onclose={() => completeTutorial(id)} {...props}>{children}</ClosableTooltip>
}

export function prepareTutorials(): void {
    if (shouldShowTutorial(DISABLED_TRACK_TUTORIAL)) {
        let removeListener: ((el: HTMLElement) => void) | null = null
        let addListener: ((el: HTMLElement, trackId?: string) => void) | null = null

        addListener = listenAddTrackNodes((el) => {
            if (!shouldShowTutorial(DISABLED_TRACK_TUTORIAL)) {
                if (addListener) unlistenAddNodes(addListener)
                return
            }

            createDisabledTrackTutorialTooltip()

            if (!removeListener) {
                removeListener = listenRemovedNodes(() => {
                    if (document.querySelectorAll(Q_DISABLED_TRACK).length === 0) {
                        removeTooltip(DISABLED_TRACK_TUTORIAL)
                        if (removeListener) {
                            unlistenRemovedNodes(removeListener)
                            removeListener = null
                        }
                    }
                })
            }
        }, Q_DISABLED_TRACK)
    }
}

export function removeTooltips(key: string): void {
    removeTooltip(key)
}

const shouldShowTutorialCache: Record<string, boolean> = {}

export function shouldShowTutorial(key: string): boolean {
    if (key in shouldShowTutorialCache) {
        return shouldShowTutorialCache[key]
    }

    const storedValue = localStorage.getItem("SHOULD_SHOW_" + key)
    return (shouldShowTutorialCache[key] = storedValue !== "false")
}

export function setShouldShowTutorial(key: string, value: boolean): void {
    shouldShowTutorialCache[key] = value
    localStorage.setItem("SHOULD_SHOW_" + key, String(value))
}

export function completeTutorial(key: string): void {
    setShouldShowTutorial(key, false)
    removeTooltip(key)
}