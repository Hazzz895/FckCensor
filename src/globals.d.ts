import '@pulsesync/yamusic-types/global'
import { h } from "@/ui/dom-factory"

declare global {
    interface Window {
        webpackChunk_N_E: any[] | undefined
        showOpenFilePicker: (args: any) => Promise<FileSystemFileHandle[]>
        __fckCensorDevBundle?: Record<string, object>
    }
    type TrackId = number | string
} 