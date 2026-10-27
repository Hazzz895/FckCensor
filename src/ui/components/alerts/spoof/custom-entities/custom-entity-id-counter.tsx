import { FALLBACK_ENTITY } from "@/api/dto/fallback";
import { notifications } from "@pulsesync/addon-sdk";

const STORAGE_COUNTER_ID = "FCK_CENSOR_CUSTOM_ENTITY_ID_COUNTER";
const CUSTOM_ENTITIES_LIMIT = 1e5
export const CUSTOM_ENTITY_ID_MAGIC = FALLBACK_ENTITY.id - CUSTOM_ENTITIES_LIMIT

let cached: number | undefined = undefined

export function getLastCustomEntityStorageId() {
    if (cached != undefined) {
        return cached;
    }
    const storageValue = localStorage.getItem(STORAGE_COUNTER_ID)
    cached = storageValue ? Number(storageValue) : 0
    return cached
}

export function getLastCustomEntityId() {
    return CUSTOM_ENTITY_ID_MAGIC + getLastCustomEntityStorageId()
}

export function increseCustomEntityId() {
    cached = getLastCustomEntityStorageId() + 1;
    if (cached >= CUSTOM_ENTITIES_LIMIT) {
        notifications.error("Вы создали СЛИШКОМ МНОГО пользовательских сущностей. Молодец, не создавайте больше.")
        throw new Error('Custom entities limit exceeded')
    }
    localStorage.setItem(STORAGE_COUNTER_ID, String(cached))
    return getLastCustomEntityId()
}

export function isCustomEntity(id: number) {
    return id >= CUSTOM_ENTITY_ID_MAGIC && id < CUSTOM_ENTITY_ID_MAGIC + CUSTOM_ENTITIES_LIMIT
}

export function isCustomEntityReal(id: number) {
    return isCustomEntity(id) && id < CUSTOM_ENTITY_ID_MAGIC + getLastCustomEntityStorageId()
}