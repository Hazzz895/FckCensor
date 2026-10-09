import { Track } from '@/types'
import { trackToQuery } from '@/utils/music'

const SEARCH_URI = 'https://lrclib.net/api/search'
const cache = new Map<string, string>()

export async function getLrclibTrackLyrics(query: string | Track) {
    if (!query) return null
    if (typeof query === 'object') query = trackToQuery(query)
    const q = String(query)

    if (cache.has(q)) return cache.get(q)!

    const response = await fetch(`${SEARCH_URI}?q=${encodeURIComponent(q)}`)
    const results: { plainLyrics?: string; syncedLyrics?: string; instrumental: boolean }[] = await response.json()
    if (!results.length) return null

    let lyrics: string | null = null

    for (const result of results) {
        if (result.instrumental) continue
        else if (result.syncedLyrics) {
            lyrics = result.syncedLyrics
            break
        } else if (!lyrics) lyrics = result.plainLyrics ?? null
    }

    if (lyrics) cache.set(q, lyrics)

    return lyrics ?? null
}
