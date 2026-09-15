import { httpsify } from "@/utils/common";
import Source from "./sources/source";

export default class TrackReplacement {
    public constructor(public readonly source: Source, public readonly url: string | null) {}

    toBatch(trackId: string) {
        if (this.url === null) {
            return null;
        }
        else {
            return {
                trackId: trackId,
                urls: [httpsify(this.url)],
                batchId: -1,
            }
        }
    }
}