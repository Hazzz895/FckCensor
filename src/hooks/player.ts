import { debug, error, log } from "@/utils/logger";
import { FunctionHook, hookDi, hookMethods } from "../utils/hook-utils";
import { sources } from "@/api/main-api";

function hook(gfir: any) {
    hookMethods(gfir, new LocalFileHook(), "getLocalFileDownloadInfo")

    hookMethods(gfir, async (idk: boolean, trackId: TrackId, quality: string) => {
        if (sources.hasPlayerReplacement(String(trackId))) {
            return true;
        } 
    }, "isTrackDownloaded");
}

class LocalFileHook extends FunctionHook {
    public async before(originalMethod: Function, trackId: TrackId) {
        const strTrackId = String(trackId)
        if (sources.hasPlayerReplacement(strTrackId)) {
            const replacement = await sources.buildPlayerReplacement(strTrackId)
            if (replacement) {
                log("Replaced track", trackId, "with", replacement.url)
                return replacement.toBatch(strTrackId)
            }
        }
    } 
}

export function hookPlayer() {
    hookDi({"GetFileInfoResource": hook})
} 