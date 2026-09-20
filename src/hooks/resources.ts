import { sources } from "@/api/main-api";
import { FunctionHook, hookDi, hookMethods, HookMethod, findModule, appRequire } from "../utils/hook-utils";
import { debug, error } from "@/utils/logger";
import { Album, OuterArtist, Playlist, SearchResponse, Track } from "@/types";
import { insert } from "@/utils/common";
import { getAlbums, getTracks } from "@/utils/music";
import addonConfig from "../../addon.config.mjs";

class GetTracksMetaHook extends FunctionHook {
    public before(originalMethod: Function, request: { trackIds?: TrackId[] }) {
        if (!Array.isArray(request?.trackIds)) {
            return;
        }

        const uuidPPAlbumId = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}):(.*)$/;
        request.trackIds = request.trackIds.map(trackId => typeof trackId === "string" ? trackId.match(uuidPPAlbumId)?.[1] ?? trackId : trackId);
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
    hookMethods(tr, new GetTracksMetaHook(), "getTracksMeta");
    hookMethods(tr, new GetFullInfoTrackHook(), "getFullInfoTrack", "getFullInfoTrackWithEtag");
} 

function hookAlbumResource(ar: any) {
    hookMethods(ar, async (albums: Album | Album[]) => {
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

    hookMethods(ar, async (albums: Album | Album[]) => {
        async function spoof(a: Album) {
            try {
                const spoof = sources.spoofAlbum(a);
                
                if (spoof?.volumes) {
                    const tracks = await getTracks(...spoof.volumes.flatMap(v => v.map(t => t.id)));
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
    hookMethods(ar, async (artist: OuterArtist) => {
        sources.spoofAnyArtist(artist)
    }, "getInfo", "getBriefInfo")

    hookMethods(ar, async (familiar: any) => {
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

    hookMethods(ar, async (trackIds: string[], t: ArtistId) => {
        sources.getArtistInsertions(String(t.artistId))?.tracks?.forEach(insertion => {
            if (insertion.index !== undefined) {
                trackIds.splice(insertion.index, 0, insertion.releaseId);
            }
            else {
                trackIds.push(insertion.releaseId)
            }
        });
    }, "getArtistTrackIds")

    hookMethods(ar, async (result: { pager?: any; tracks?: Track[] } | Track[], t: ArtistId) => {
        const tracks = Array.isArray(result) ? result : result?.tracks;
        if (!tracks) return;
        try {
            await addInsertionsToTracksList(tracks, String(t.artistId));
        } catch (e) {
            error(e);
        }
    }, "getArtistTracks");

    hookMethods(ar, async (result: { pager?: any; albums?: Album[] } | Album[], t: ArtistId) => {
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
        console.error("GETTING", sources.getArtistInsertions(artistId));
        const insertionTracksMeta = await getAlbums(...insertions.map(x => x.releaseId));
        console.error(insertionTracksMeta, insertions, albums);
        insertions.forEach((insertion, i) => {
            insert(albums, insertionTracksMeta[i], insertion.index);
        })
    }
    return insertions;
}

function hookLandingResource(lr: any) {
    hookMethods(lr, async (block: any, info: { type?: "ARTIST_POPULAR_TRACKS" | "ARTIST_ALBUMS", source?: { uri?: string } }) => {
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
            for (const track of block.tracks) {
                sources.spoofTrack(track)
            }
        }

        if (block.release) {
            sources.spoofAlbum(block.release.album)
            for (const a of block.release.artists) {
                sources.spoofAnyArtist(a)
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
    hookMethods(sr, async (response: SearchResponse) => { 
        for (const best of response.bestResults) {
            if (best.best_result_track) sources.spoofTrack(best.best_result_track);
            if (best.best_result_album) sources.spoofAlbum(best.best_result_album);
            if (best.best_result_artist) sources.spoofAnyArtist(best.best_result_artist);
        }
        
        for (const r of response.results) {
            if (r.album) sources.spoofAlbum(r.album);
            if (r.artist) sources.spoofAnyArtist(r.artist);
            if (r.track) sources.spoofTrack(r.track);
        }
    }, "getInstantMixedSearch")
}

function hookChartResource(cr: any) {
    hookMethods(cr, async (chart: { chart: Playlist }) => {
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

export function hookResources() { 
    hookDi({
        "TracksResource": hookTrackResource,
        "AlbumResource": hookAlbumResource,
        "ArtistsResource": hookArtistResource,
        "LandingResource": hookLandingResource,
        "Landing3Resource": hookChartResource,
        "SearchResource": hookSearchResource,
        //"DisclaimersResource": hookDisclaimersResource,
    })
} 