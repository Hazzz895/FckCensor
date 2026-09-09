import { sources } from "@/api/main-api";
import { hookDi, hookMethods, HookMethod, findModule, appRequire } from "../utils/hook-utils";
import { debug, error } from "@/utils/logger";
import { Album, OuterArtist, SearchResponse, Track } from "@/types";
import { insert } from "@/utils/common";
import { getAlbums, getTracks } from "@/utils/music";

function hookTrackResource(tr: any) {
    hookMethods(tr, async (tracks: Track) => {
        if (Array.isArray(tracks)) {
            for (const t of tracks) {
                try {
                    sources.spoofTrack(t);
                } catch (e) {
                    error(e);
                }
            }
        }
    }, "getTracksMeta")

    hookMethods(tr, async (info: any) => {
        if (info) {
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
    }, "getFullInfoTrack", "getFullInfoTrackWithEtag");
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
    }, "getAlbums", "getAlbumWithRichTracks", "getAlbumWithTracksIds", "getAlbumWithTracksIdsWithEtag");
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
        debug("\n\n\n\n\n",block, info)
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

        debug(Array.isArray(block.items), info.type === "ARTIST_ALBUMS", getArtistId())
        if (Array.isArray(block.items)) {
            if (info.type === "ARTIST_ALBUMS" && getArtistId()) {
                debug("DOIJDJODIOIJDOIJDJODIOIJDODIJOIJJOIDOIJDOIJD\n\n\n")
                const albums: Album[] = [];
                const insertions = await addInsertionsToAlbumsList(albums, _artistId!);
                debug(albums, insertions)
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
                    debug(data)
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
        for (const r of response.results) {
            if (r.album) sources.spoofAlbum(r.album);
            if (r.artist) sources.spoofAnyArtist(r.artist);
            if (r.track) sources.spoofTrack(r.track);
            debug(r)
        }
    }, "getInstantMixedSearch")
}

export function hookResources() { 
    hookDi({
        "TracksResource": hookTrackResource,
        "AlbumResource": hookAlbumResource,
        "ArtistsResource": hookArtistResource,
        "LandingResource": hookLandingResource,
        "SearchResource": hookSearchResource
    })
} 