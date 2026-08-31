import Source from "./sources/source";

export default class TrackReplacement {
    public readonly source: Source
    public readonly url: string

    public constructor(source: Source, url: string) {
        this.source = source;
        this.url = url;
    }

    toBatch(trackId: string) {
        return {
            trackId: trackId,
            urls: [this.url],
            batchId: -1,
        }
    }
}