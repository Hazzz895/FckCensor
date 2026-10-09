import { Track } from '@/types'
import { getResourceReads } from '@/sdk/resources'
import { getLrclibTrackLyrics } from '@/api/lrclib-api'
import { getGeniusTrackLyrics } from '@/api/genius-api'
import { putToBundle } from '@/dev/dev-utils'

export async function getVanillaTrackLyrics(trackId: TrackId | Track): Promise<string | null> {
    if (!trackId) return null
    if (typeof trackId === 'object') {
        if (!trackId.lyricsAvailable) return null
        trackId = trackId.id
    }

    try {
        const id = String(trackId)
        const resources = getResourceReads()
        const downloadLyrics = (format: 'LRC' | 'TEXT') => resources.getLyrics(id, format)

        let syncedLyricsError: unknown
        let syncedLyricsFailed = false
        try {
            const syncedLyrics = await downloadLyrics('LRC')
            if (syncedLyrics !== null) return syncedLyrics
        } catch (error) {
            syncedLyricsError = error
            syncedLyricsFailed = true
        }

        const plainLyrics = await downloadLyrics('TEXT')
        if (plainLyrics !== null) return plainLyrics
        if (syncedLyricsFailed) throw syncedLyricsError
        return null
    } catch (error) {
        return null
    }
}

export async function getAnyTrackLyrics(track: Track): Promise<string | null> {
    const tryGet = async (api: (track: Track) => Promise<string | null>): Promise<string | null> => {
        try {
            return await api(track)
        } catch (error) {
            return null
        }
    }

    return (await tryGet(getVanillaTrackLyrics)) ?? (await tryGet(getLrclibTrackLyrics)) ?? (await tryGet(getGeniusTrackLyrics))
}

putToBundle('getAnyTrackLyrics', getAnyTrackLyrics)
