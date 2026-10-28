import { FALLBACK_ENTITY } from "@/api/dto/fallback";
import { getStorageNumber, setStorageItem } from "@/utils/storage";
import { notifications } from "@pulsesync/addon-sdk";

const STORAGE_COUNTER_ID = "FCK_CENSOR_CUSTOM_ENTITY_ID_COUNTER";
const CUSTOM_ENTITIES_LIMIT = 1e5
export const CUSTOM_ENTITY_ID_MAGIC = FALLBACK_ENTITY.id - CUSTOM_ENTITIES_LIMIT

export function getLastCustomEntityStorageId() {
    return getStorageNumber(STORAGE_COUNTER_ID)
}

export function getLastCustomEntityId() {
    return CUSTOM_ENTITY_ID_MAGIC + getLastCustomEntityStorageId()
}

export function increseCustomEntityId() {
    const n = getLastCustomEntityStorageId() + 1;
    setStorageItem(STORAGE_COUNTER_ID, n);
    if (n >= CUSTOM_ENTITIES_LIMIT) {
        throw new Error('Custom entities limit exceeded')
    }
    return getLastCustomEntityId()
}

export function isCustomEntity(id: number) {
    return id >= CUSTOM_ENTITY_ID_MAGIC && id < CUSTOM_ENTITY_ID_MAGIC + CUSTOM_ENTITIES_LIMIT
}

export function isCustomEntityReal(id: number) {
    return isCustomEntity(id) && id < CUSTOM_ENTITY_ID_MAGIC + getLastCustomEntityStorageId()
}