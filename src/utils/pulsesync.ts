import { PulseSyncApi, PulseSyncTrackMeta } from "@pulsesync/yamusic-types";

const pulsesyncApi = (window as Window & { pulsesyncApi?: PulseSyncApi }).pulsesyncApi;

export function setProgress(progress: number) {
    pulsesyncApi?.setProgress(progress);
}

export function onCurrentTrackChange(listener: (track: PulseSyncTrackMeta | null) => void) {
    pulsesyncApi?.onCurrentTrackChange(listener);
}