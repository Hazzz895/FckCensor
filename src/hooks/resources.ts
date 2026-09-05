import { sources } from "@/api/main-api";
import { hookDi, hookMethods, HookMethod, findModule, appRequire } from "../utils/hook-utils";
import { debug, error } from "@/utils/logger";
import { Album, OuterArtist, SearchResponse, Track } from "@/types";
import { insert } from "@/utils/common";

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

    type ArtistId = { artistId: string }

    hookMethods(ar, async (trackIds: string[], t: ArtistId) => {
        sources.getArtistInsertions(t.artistId)?.tracks.forEach(insertion => {
            if (insertion.release) {
                const id = String(insertion.release.id);
                if (insertion.index !== undefined) {
                    trackIds.splice(insertion.index, 0, id)
                }
                else {
                    trackIds.push(id)
                }
            }
        });
    }, "getArtistTrackIds")

    hookMethods(ar, async (tracks: Track[], t: ArtistId) => {
        sources.getArtistInsertions(t.artistId)?.tracks.forEach(insertion => {
            if (insertion.release) {
                debug(tracks)
                insert(tracks, insertion.release, insertion.index);
                debug(tracks)
            }
        });
    }, "getArtistTracks");

    hookMethods(ar, async (albums: Album[], t: ArtistId) => {
        sources.getArtistInsertions(t.artistId)?.albums.forEach(insertion => {
            if (insertion.release) {
                insert(albums, insertion.release, insertion.index);
            }
        });
    }, "getDirectAlbums");
}

function hookLandingResource(lr: any) {
    hookMethods(lr, async (block: any) => {
        if (Array.isArray(block.tracks)) {
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
            if (r.track) sources.spoofTrack(r.track)
        }
    })
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