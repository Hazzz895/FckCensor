import { debug } from "./logger"

export const createFlags = (length: number) => Array.from({length}, (_, i) => 1 << i)

export const addFlag = (flags: number, flag: number) => flags |= flag

export const removeFlag = (flags: number, flag: number) => flags &= ~flag

export const hasFlag = (flags: number, flag: number) => (flags & flag) !== 0

export function flagsToStrings(flags: number, strings: { [flag: number]: String }) {
    const result = []
    for (let i = 0; i < 31; i++) {
        const target = 1 << i
        if (target > flags) return result;
        else if (!hasFlag(flags, target)) continue;
        const string = strings[target] || strings[-1]
        if (string) {
            result.push(string)
        }
    }
    return result
}