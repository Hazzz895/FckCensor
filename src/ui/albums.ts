import { Q_ALBUM_FIBER_ROOT } from "@/hooks/ui/constants";
import { Album } from "@/types";
import { getDiResource } from "@/utils/hook-utils";
import { getAlbumFromNode, findMstAncestor, getMstRootStore } from "@/utils/ui-utils";
import { error, warn, log } from "@/utils/logger";

export function getAlbumPageStore(albumId: TrackId): any | null {
    const id = String(albumId);

    for (const node of document.querySelectorAll<HTMLElement>(Q_ALBUM_FIBER_ROOT)) {
        let album: Album | null = null;
        try {
            album = getAlbumFromNode(node);
        } catch (e) {
            error(e);
            continue;
        }
        if (!album) continue;

        const store = findMstAncestor(album, store => store?.getData && store?.makeFlatVolumeItems && String(store.id) === id);
        if (store) return store;
    }

    return null;
}

export async function reloadAlbumPage(albumId: TrackId): Promise<boolean> {
    const id = String(albumId);
    const store = getAlbumPageStore(id);

    if (!store) {
        return false;
    }

    const albumResource = getDiResource("AlbumResource");
    if (!albumResource) {
        return false;
    }

    try {
        const raw: Album | null = await albumResource.getAlbumWithTracksIds({ albumId: Number(id), resumeStream: false });

        if (!raw || !Array.isArray(raw.volumes)) {
            warn("Failed to fetch album tracks for reload", id, raw);
            return false;
        }

        const { initialTrackIds, unloadedEntitiesData } = store.makeFlatVolumeItems(raw);

        const sonataState = getMstRootStore<any>(store)?.sonataState;
        if (sonataState?.setUnloadedEntitiesData) {
            sonataState.setUnloadedEntitiesData(unloadedEntitiesData);
        }

        await store.getTracks({ trackIds: initialTrackIds });

        log("Album tracks reloaded", id);
        return true;
    } catch (e) {
        error("Failed to reload album tracks", e);
        return false;
    }
}