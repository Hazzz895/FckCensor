import { FALLBACK_ENTITY } from '@/api/dto/fallback'
import { isCustomEntity } from './custom-entity-id-counter'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function customIdOf(item: unknown): string | null {
    if (typeof item === 'number') return isCustomEntity(item) ? String(item) : null
    if (typeof item !== 'string') return null
    const id = item.split(':', 1)[0]
    return isCustomEntity(Number(id)) ? id : null
}

export interface SplitIds  {
    rest: unknown[]
    customIds: string[]
}

export function splitTrackIds(items: readonly unknown[]): SplitIds {
    const rest: unknown[] = []
    const customIds: string[] = []
    const pushCustom = (id: string) => {
        if (!customIds.includes(id)) customIds.push(id)
    }

    for (const item of items) {
        const customId = customIdOf(item)
        if (customId !== null) {
            pushCustom(customId)
            continue
        }
        if (typeof item !== 'string') {
            rest.push(item)
            continue
        }

        const colonIndex = item.indexOf(':')
        if (colonIndex === -1) {
            rest.push(item)
            continue
        }

        const trackId = item.slice(0, colonIndex)
        const albumId = item.slice(colonIndex + 1)
        rest.push(UUID_REGEX.test(trackId) || albumId === String(FALLBACK_ENTITY.id) || isCustomEntity(Number(albumId)) ? trackId : item)
    }

    return { rest, customIds }
}


export function splitAlbumIds(items: readonly unknown[]): SplitIds {
    const rest: unknown[] = []
    const customIds: string[] = []

    for (const item of items) {
        if (!isCustomEntity(Number(item))) {
            rest.push(item)
            continue
        }
        const id = String(item)
        if (!customIds.includes(id)) customIds.push(id)
    }

    return { rest, customIds }
}

export function requestFingerprint(items: readonly unknown[]): string {
    return JSON.stringify(items)
}

const STASH_TTL_MS = 60_000

export class CustomIdsStash {
    private readonly entries = new Map<string, { ids: string[]; at: number }[]>()

    put(key: string, ids: string[]) {
        this.sweep()
        const queue = this.entries.get(key) ?? []
        queue.push({ ids, at: Date.now() })
        this.entries.set(key, queue)
    }

    take(key: string): string[] {
        this.sweep()
        const queue = this.entries.get(key)
        const entry = queue?.shift()
        if (queue && queue.length === 0) this.entries.delete(key)
        return entry?.ids ?? []
    }

    private sweep() {
        const now = Date.now()
        for (const [key, queue] of this.entries) {
            const fresh = queue.filter(entry => now - entry.at < STASH_TTL_MS)
            if (fresh.length) this.entries.set(key, fresh)
            else this.entries.delete(key)
        }
    }
}

export function takeCustomIds(stash: CustomIdsStash, requested: unknown, split: (items: readonly unknown[]) => SplitIds): string[] {
    if (!Array.isArray(requested)) return []

    const { rest, customIds } = split(requested)
    const key = requestFingerprint(rest)
    if (customIds.length) {
        stash.take(key)
        return customIds
    }
    return stash.take(key)
}
