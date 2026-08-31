export const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

export function numberToHsl(number: number) {
    const phi = 0.618033988749895; 

    let hash = number * phi;
    hash -= Math.floor(hash);
    
    const hue = Math.floor(hash * 360);
    
    return `hsl(${hue}, 85%, 80%)`;
}

export const httpsify = (url: string) => url.includes("://") ? url : "https://" + url;

/* obj is null or {} */
export function isEmptyObject(obj?: object | null) {
    if (!obj) return true;

    for (let _ in obj) 
        return false;

    return true;
}

export const randomString = () => Math.random().toString(36).slice(2);