import { sources } from "@/api/main-api";
import { FunctionHook, hookDi, hookMethods, HookMethod, findModule, appRequire, Hook, unhook } from "../utils/hook-utils";
import { debug, error } from "@/utils/logger";
import { Album, OuterArtist, Playlist, SearchResponse, Track } from "@/types";
import { insert } from "@/utils/common";
import { getAlbums, getTracks } from "@/utils/music";
import addonConfig from "../../addon.config.mjs";
import { isLiteMode, listenSettings } from "@/utils/pulsesync";
import { h } from "@/jsx-runtime";
import { showNotificationSafe } from "@/utils/ui-utils";
import { toggleSettingsHook } from "./ui/settings";
import { FALLBACK_ENTITY } from "@/api/dto/fallback";

const heavyMethodsUnhooks: string[] = []

/** хук методов, которые должны отключаться при включении упрощённого режима */
function hookHeavyMethods(obj: any, hook: Hook, ...methodNames: [string, ...string[]]): string[] | null {
    if (isLiteMode()) return null;

    const unhooks = hookMethods(obj, hook, ...methodNames);
    if (unhooks) heavyMethodsUnhooks.push(...unhooks);
    return unhooks;
}

class GetTracksMetaHook extends FunctionHook {
    public before(originalMethod: Function, request: { trackIds?: TrackId[] }) {
        if (!Array.isArray(request?.trackIds)) {
            return;
        }

        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        request.trackIds = request.trackIds.map(item => {
            if (typeof item !== 'string') return item;

            const colonIndex = item.indexOf(':');
            if (colonIndex === -1) return item;

            const trackId = item.slice(0, colonIndex);
            const albumId = item.slice(colonIndex + 1);

            if (UUID_REGEX.test(trackId) || albumId === String(FALLBACK_ENTITY.id)) {
                return trackId;
            }
            
            return item;
        });
    }

    public after(tracks: Track[]) {
        if (Array.isArray(tracks)) {
            for (const t of tracks) {
                try {
                    sources.spoofTrack(t);
                } catch (e) {
                    error(e);
                }
            }
        }
        else {
            sources.spoofTrack(tracks);
        }
        return tracks;
    }
}

class GetFullInfoTrackHook extends GetTracksMetaHook {
    public after(info: any) {
        if (info && "track" in info) {
            sources.spoofTrack(info.track);
            if (Array.isArray(info.similarTracks)) {
                for (const st of info.similarTracks) {
                    try {
                        sources.spoofTrack(st);
                    } catch (e) {
                        error(e);
                    }
                }
            }
        }
        return info
    }
}

function hookTrackResource(tr: any) {
    hookHeavyMethods(tr, new GetTracksMetaHook(), "getTracksMeta");
    hookHeavyMethods(tr, new GetFullInfoTrackHook(), "getFullInfoTrack", "getFullInfoTrackWithEtag");
} 

function hookAlbumResource(ar: any) {
    hookHeavyMethods(ar, async (albums: Album | Album[]) => {
        if (Array.isArray(albums)) {
            for (const a of albums) {
                try {
                    sources.spoofAlbum(a);
                } catch (e) {
                    error(e);
                }
            }
        }
        else if (albums) {
            try {
                sources.spoofAlbum(albums);
            } catch (e) {
                error(e);
            }
        }
    }, "getAlbums", "getAlbumWithTracksIds", "getAlbumWithTracksIdsWithEtag");

    hookHeavyMethods(ar, async (albums: Album | Album[]) => {
        async function spoof(a: Album) {
            try {
                const spoof = sources.spoofAlbum(a);
                
                if (spoof?.volumes) {
                    const tracks = await getTracks(...spoof.volumes.flatMap(v => v.map(t => String(t.id))));
                    let i = 0;
                    a.volumes = spoof.volumes.map(volume => {
                        const volumeTracks = tracks.slice(i, i + volume.length);
                        i += volume.length;
                        return volumeTracks;
                    });
                }
            } catch (e) {
                error(e)
            }
        }

        if (Array.isArray(albums)) {
            for (const a of albums) {
                await spoof(a)
            }
        }
        else if (albums) {
            await spoof(albums)
        }
    }, "getAlbumWithRichTracks");
}

function hookArtistResource(ar: any) {
    hookHeavyMethods(ar, async (artist: OuterArtist) => {
        sources.spoofAnyArtist(artist)
    }, "getInfo", "getBriefInfo")

    hookHeavyMethods(ar, async (familiar: any) => {
        function spoofTab(tab: any) {
            if (!tab) return;

            if (Array.isArray(tab.tracks)) {
                for (const track of tab.tracks) {
                    sources.spoofTrack(track)
                }
            }

            if (Array.isArray(tab.albums)) {
                for (const album of tab.albums) {
                    sources.spoofAlbum(album)
                }
            }
        }

        spoofTab(familiar.wave)
        spoofTab(familiar.collection)
    }, "getFamiliarYou")

    type ArtistId = { artistId: number }

    hookHeavyMethods(ar, async (trackIds: string[], t: ArtistId) => {
        sources.getArtistInsertions(String(t.artistId))?.tracks?.forEach(insertion => {
            insert(trackIds, insertion.releaseId, insertion.index);
        });
    }, "getArtistTrackIds")

    hookHeavyMethods(ar, async (result: { pager?: any; tracks?: Track[] } | Track[], t: ArtistId) => {
        const tracks = Array.isArray(result) ? result : result?.tracks;
        if (!tracks) return;
        try {
            await addInsertionsToTracksList(tracks, String(t.artistId));
        } catch (e) {
            error(e);
        }
    }, "getArtistTracks");

    hookHeavyMethods(ar, async (result: { pager?: any; albums?: Album[] } | Album[], t: ArtistId) => {
        const albums = Array.isArray(result) ? result : result?.albums;
        if (!albums) return;
        try {
            await addInsertionsToAlbumsList(albums, String(t.artistId));
        } catch (e) {
            error(e);
        }
    }, "getDirectAlbums");
}

async function addInsertionsToTracksList(tracks: Track[], artistId: string) {
    const insertions = sources.getArtistInsertions(artistId)?.tracks;
    if (insertions) {
        const insertionTracksMeta = await getTracks(...insertions.map(x => x.releaseId));
        insertions.forEach((insertion, i) => {
            insert(tracks, insertionTracksMeta[i], insertion.index);
        })
    }
    return insertions;
}

async function addInsertionsToAlbumsList(albums: Album[], artistId: string) {
    const insertions = sources.getArtistInsertions(artistId)?.albums;
    if (insertions) {
        const insertionTracksMeta = await getAlbums(...insertions.map(x => x.releaseId));
        insertions.forEach((insertion, i) => {
            insert(albums, insertionTracksMeta[i], insertion.index);
        })
    }
    return insertions;
}

function hookLandingResource(lr: any) {
    hookHeavyMethods(lr, async (block: any, info: { type?: "ARTIST_POPULAR_TRACKS" | "ARTIST_ALBUMS", source?: { uri?: string } }) => {
        let _artistId: string | undefined | null;
        function getArtistId() {
            if (_artistId !== undefined) return _artistId;
            _artistId = null;
            const re = /\/artists\/(\d*)\/.*/;
            if (info.source?.uri && re.test(info.source?.uri)) {
                _artistId = info.source.uri.match(re)![1];
            }
            return _artistId;
        }

        if (Array.isArray(block.tracks)) {
            if (info.type === "ARTIST_POPULAR_TRACKS" && getArtistId()) {
                const insertions = await addInsertionsToTracksList(block.tracks, _artistId!);
                if (insertions && block.pager?.total !== undefined) {
                    block.pager.total += insertions.length
                }
            }
            if (Array.isArray(block.tracks)) {
                for (const track of block.tracks) {
                    sources.spoofTrack(track)
                }
            }
        }

        if (block.release) {
            sources.spoofAlbum(block.release.album)
            if (Array.isArray(block.release.artists)) {
                for (const a of block.release.artists) {
                    sources.spoofAnyArtist(a)
                }
            }
        }

        if (Array.isArray(block.items)) {
            if (info.type === "ARTIST_ALBUMS" && getArtistId()) {
                const albums: Album[] = [];
                const insertions = await addInsertionsToAlbumsList(albums, _artistId!);
                insertions?.forEach((insertion, i) => {
                    const album = albums[i]
                    const data = {
                        "type": "album_item", 
                        "data": {
                            "album": album,
                            "artists": album.artists,
                            "releaseDate": album.releaseDate
                        }
                    }
                    insert(block.items, data, insertion.index);
                })
            }

            for (const item of block.items) {
                switch (item.type) {
                    case "album_item":
                        sources.spoofAlbum(item.data.album)
                        for (const a of item.data.artists) {
                            sources.spoofAnyArtist(a)
                        }
                        break;
                    case "artist_item":
                        sources.spoofAnyArtist(item.data.artist)
                }
            }
        }
    }, "getBlock")
}

function hookSearchResource(sr: any) {
    hookHeavyMethods(sr, async (response: SearchResponse) => { 
        if (Array.isArray(response.bestResults)) {
            for (const best of response.bestResults) {
                if (best.best_result_track) sources.spoofTrack(best.best_result_track);
                if (best.best_result_album) sources.spoofAlbum(best.best_result_album);
                if (best.best_result_artist) sources.spoofAnyArtist(best.best_result_artist);
            }
        }
        
        if (Array.isArray(response.results)) {
            for (const r of response.results) {
                if (r.album) sources.spoofAlbum(r.album);
                if (r.artist) sources.spoofAnyArtist(r.artist);
                if (r.track) sources.spoofTrack(r.track);
            }
        }
    }, "getInstantMixedSearch")
}

function hookChartResource(cr: any) {
    hookHeavyMethods(cr, async (chart: { chart: Playlist }) => {
        debug(chart, Array.isArray(chart?.chart?.tracks))
        if (Array.isArray(chart?.chart?.tracks)) {
            for (const t of chart.chart.tracks) {
                if (!t.track) continue;
                sources.spoofTrack(t.track);
            }
        }
    }, "getChart");
}

function hookDisclaimersResource(dr: any) {
    hookMethods(dr, async (disclaimers: { id: string, type: string, title: string }[]) => {
        disclaimers.push({
            id: addonConfig.id,
            type: 'informational',
            title: 'Трек был подменён'
        })
    }, "getDisclaimers")
}

export function hookRotorResource(doubleRR: any) {
    hookHeavyMethods(doubleRR, async (session: { sequence: { track?: Track }[] }) => {
        if (Array.isArray(session?.sequence)) {
            for (const seq of session.sequence) {
                if (!seq.track) continue;
                sources.spoofTrack(seq.track)
            }
        }
    }, "sessionTracks", "sessionNew", "sessionClone", "sessionFeedback", "sessionFeedbacks", "sessionsFeedbacks", "combinedSessionNew", "combinedSessionNext")
}

export function hookResources() { 
    if (heavyMethodsUnhooks.length > 0 || isLiteMode()) return

    hookDi({
        "TracksResource": hookTrackResource,
        "AlbumResource": hookAlbumResource,
        "ArtistsResource": hookArtistResource,
        "LandingResource": hookLandingResource,
        "Landing3Resource": hookChartResource,
        "SearchResource": hookSearchResource,
        "RotorResource": hookRotorResource,
        //"DisclaimersResource": hookDisclaimersResource,
    })
} 

let toggledLiteModePreviously = false;

export function toggleLiteMode(enabled: boolean) {
    if ((enabled && heavyMethodsUnhooks.length === 0) || (!enabled && heavyMethodsUnhooks.length > 0)) return
    debug((enabled ? "Enabling" : "Disabling") + " lite mode");

    if (toggledLiteModePreviously) {
        showNotificationSafe("Упрощённый режим " + (enabled ? "включён" : "выключён"), "info", { icon: "settings"});
    }
    toggledLiteModePreviously = true;

    if (enabled) {
        debug("Unhooking heavy methods", heavyMethodsUnhooks);
        unhook(...heavyMethodsUnhooks);
        heavyMethodsUnhooks.length = 0;
    }
    else {
        hookResources();
    }
}