const cache = new Map<string, string>()

export function setStorageItem(key: string, item: any) {
    let value: string;
    switch (typeof item) {
        case 'object': value = JSON.stringify(item); break;
        case 'string': value = item; break;
        case 'function': return setStorageItem(key, item());
        default: value = String(item); break;
    }
    cache.set(key, value);
    localStorage.setItem(key, value);
    return value;
}

export function getStorageItem(key: string) {
    if (cache.has(key)) {
        return cache.get(key)!;
    }

    const storageValue = localStorage.getItem(key);
    let value = 'null';
    if (storageValue === null) {
        cache.set(key, String(null));
    }
    else {
        value = setStorageItem(key, storageValue)
    }

    return value;
}

export function getStorageItemNullable(key: string) {
    const value = getStorageItem(key);
    if (value === 'undefined') return undefined;
    else if (value === 'null') return null;
    else return value;
}

function getStorageItemNullableInternal<T>(key: string, fallback: T, nonNullFunc:  (key: string, fallback: T) => T) {
    const value = getStorageItemNullable(key);
    try {
        if (typeof value === 'string') return nonNullFunc(key, fallback);
        else return value;
    }
    catch {
        return fallback;
    }
}

export function getStorageBoolean(key: string, fallback: boolean = false) {
    const value = getStorageBooleanNullable(key, fallback);
    if (value === null || value === undefined) {
        return fallback
    }
    else {
        return value;
    }
}

export const getStorageBooleanNullable = (key: string, fallback: boolean = false) =>
    getStorageItemNullableInternal(key, fallback, (key, fallback) => {
        const value = getStorageItem(key);
        if (value === 'true' || value === 'false') {
            return value === 'true'
        }
        else {
            return fallback;
        }
    });

export function getStorageNumber(key: string, fallback: number = 0) {
    const value = getStorageItem(key);
    try {
        const parsedValue = Number(value)

        if (isNaN(parsedValue)) return fallback;
        else return parsedValue;
    }
    catch {
        return fallback;
    }
}

export const getStorageNumberNullable = (key: string, fallback: number = 0) =>
    getStorageItemNullableInternal(key, fallback, getStorageNumber);

export function getStorageObject<T>(key: string): T | null {
    return getStorageItemNullableInternal<T | null>(key,
        null,
        (key, _) => JSON.parse(getStorageItem(key))) ??
        null;
}

export function clearStorageItem(key: string) {
    cache.delete(key);
    localStorage.removeItem(key);
}