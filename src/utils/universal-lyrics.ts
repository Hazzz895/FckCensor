import { Track } from "@/types";
import { getDiResource } from "./hook-utils";
import { getLrclibTrackLyrics } from "@/api/lrclib-api";
import { getGeniusTrackLyrics } from "@/api/genius-api";
import { putToBundle } from "@/dev/dev-utils";

type LyricsFormat = "LRC" | "TEXT";

type LyricsResponse = {
    downloadUrl?: string;
};

function getLyricsSigningSecret(): string {
    const platform = (window as Window & { PLATFORM?: string }).PLATFORM;
    switch (platform) {
        case "win32":
            return "kzqU4XhfCaY6B6JTHODeq5";
        case "darwin":
            return "uz0zSpaYCLmgk6C7YLdo5F";
        case "linux":
            return "uVNvVMAvdrvjtwN0VlhEt2";
        default:
            throw new Error(`Unsupported platform for native lyrics signing: ${platform ?? "unknown"}`);
    }
}

async function getLyricsRequest(trackId: string, format: LyricsFormat) {
    const timeStamp = Math.floor(Date.now() / 1000);
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(getLyricsSigningSecret()),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(`${trackId}${timeStamp}`)
    );
    const sign = btoa(String.fromCharCode(...new Uint8Array(signature)));

    return { sign, timeStamp, trackId, format };
}

export async function getVanillaTrackLyrics(trackId: TrackId | Track): Promise<string | null> {
    if (!trackId) return null;
    if (typeof trackId === "object") {
        if (!trackId.lyricsAvailable) return null;
        trackId = trackId.id;
    }

    try {
        const id = String(trackId);
        const tracksResource = getDiResource("TracksResource");
        const prefixlessResource = getDiResource("PrefixlessResource");

        if (!tracksResource || !prefixlessResource) {
            return null;
        }

        const downloadLyrics = async (format: LyricsFormat): Promise<string | null> => {
            const response: LyricsResponse | null = await tracksResource.getLyrics(await getLyricsRequest(id, format));
            if (!response?.downloadUrl) return null;
            return prefixlessResource.getLyricsText(response.downloadUrl);
        };

        let syncedLyricsError: unknown;
        let syncedLyricsFailed = false;
        try {
            const syncedLyrics = await downloadLyrics("LRC");
            if (syncedLyrics !== null) return syncedLyrics;
        } catch (error) {
            syncedLyricsError = error;
            syncedLyricsFailed = true;
        }

        const plainLyrics = await downloadLyrics("TEXT");
        if (plainLyrics !== null) return plainLyrics;
        if (syncedLyricsFailed) throw syncedLyricsError;
        return null;
    }
    catch (error) {
        return null;
    }
}