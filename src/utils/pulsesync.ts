import { getSdkApi } from '@/sdk/lifecycle'
import { player } from '@pulsesync/addon-sdk'
import type { PulseSyncTrackMeta } from '@pulsesync/yamusic-types'
export function setProgress(progress: number) {
    getSdkApi()?.client.setProgress(progress)
}
export function onCurrentTrackChange(listener: (track: PulseSyncTrackMeta | null) => void) {
    return player.onTrackChange(listener)
}
