import { Album, Artist, OuterArtist, SpoofableEntity, SpoofableType, Track, TrackMST } from "@/types";
import { createFlags, flagsToStrings } from "./flags";
import { debug } from "./logger";
import { sources } from "@/api/main-api";
import { randomString } from "./common";
import { Q_ARTIST_FIBER_ROOT, Q_ALBUM_FIBER_ROOT, Q_TRACK_ROOT } from "@/hooks/ui/constants";

export function getTrackIdFromNode(node: HTMLElement): string | null {
    return String(getTrackFromNode(node)?.id) ?? null;
}

export function walkFiber<T>(node: HTMLElement | null, callback: (obj: any) => any | null, maxDepth: number = 4): T | null {
    if (!node) return null;
    let result = null;
    const reactFiberProp = Object.keys(node).find(key => key.startsWith("__reactFiber"));
    if (reactFiberProp) {
        const fiber = (node as Record<string, any>)[reactFiberProp];
        let depth = 0;
        if (fiber !== undefined && fiber !== null) {
            const walk = (fiberNode: any, currentDepth: number): T | null => {
                if (!fiberNode || currentDepth >= maxDepth) return null;
                
                const result = callback(fiberNode)
                if (result !== undefined) {
                    return result;
                }
                
                const children = fiberNode.memoizedProps?.children;
                if (children) {
                    if (Array.isArray(children)) {
                        for (const child of children) {
                            const result = walk(child, currentDepth + 1);
                            if (result) return result;
                        }
                    } else {
                        const result = walk(children, currentDepth + 1);
                        if (result) return result;
                    }
                }
                
                if (fiberNode.child) {
                    const result = walk(fiberNode.child, currentDepth + 1);
                    if (result) return result;
                }
                
                return null;
            };
            
            result = walk(fiber, depth);
        }
    }
    return result;
}

export function getTrackFromNode(node: HTMLElement): TrackMST | null {
    return walkFiber(closestInTree(node, Q_TRACK_ROOT), (obj) => obj?.props?.track);
}

export function getAlbumFromNode(node: HTMLElement): Album | null {
    return walkFiber(closestInTree(node, Q_ALBUM_FIBER_ROOT), (obj) => obj?.props?.album)
}

export function getArtistFromNode(node: HTMLElement): Artist | null {
    const a: Artist | OuterArtist | null = walkFiber(closestInTree(node, Q_ARTIST_FIBER_ROOT), (obj) => obj?.props?.artistMeta)
    if (!a) {
        return null;
    }

    if ("artist" in a) {
        return a.artist;
    }
    else {
        return a;
    }
}

export function spoofNode(node: HTMLElement, entity: SpoofableEntity | SpoofableType) {
    let e;
    let m: any;
    if (typeof entity === "string") {
        switch (entity) {
            case "track": e = getTrackFromNode(node); m = sources.spoofTrack; break;
            case "album": e = getAlbumFromNode(node); m = sources.spoofAlbum; break;
            case "artist": e = getArtistFromNode(node); m = sources.spoofArtist; break;
        }
    }
    else {
        e = entity
        if ("volumes" in e) {
            m = sources.spoofAlbum;
        }
        else if ("albums" in e) {
            m = sources.spoofTrack;
        }
        else {
            m = sources.spoofArtist;
        }
    }

    if (!e) return;

    runUnprotected(e, () => {
        m(e);
        if ("isAvailable" in e && "available" in e && e.available !== undefined) {
            e.isAvailable = e.available;
        }
    });
}

export const [LEFT, TOP, RIGHT, BOTTOM, CENTER] = createFlags(5)
const anchorToString = {
    [LEFT]: "left",
    [TOP]: "top",
    [RIGHT]: "right",
    [BOTTOM]: "bottom",
    [CENTER]: "center",
}

export function anchorElement(anchor: HTMLElement, target: HTMLElement, area: number = LEFT | TOP) {
    const anchorName = '--' + randomString();
    const strArea = flagsToStrings(area, anchorToString).join(" ");
    anchor.style.anchorName = anchorName;
    target.style.positionAnchor = anchorName;
    target.style.positionArea = strArea;
    target.style.positionVisibility = "anchors-visible";
}

export function computeStyle(classes: Record<string, string | number | undefined | null>) {
    return Object.entries(classes).filter((_,v)=> !!v).map((k,v) => `${k}: ${v}`).join('; ');
}

/* thx gemini */
export function runUnprotected(target: any, callback: () => void) {
    const node = target?.$treenode;
    if (node) {
        const nodesToPatch = [node];
        if (node.root) {
            nodesToPatch.push(node.root);
        }

        const originalAssertWritables = new Map<any, any>();
        const originalProtections = new Map<any, any>();

        for (const n of nodesToPatch) {
            if (typeof n.assertWritable === "function") {
                originalAssertWritables.set(n, n.assertWritable);
                n.assertWritable = function () { };
            }

            const wasProtected = n.isProtected;
            originalProtections.set(n, wasProtected);

            n.isProtected = false;
        }

        try {
            callback();
        } finally {
            for (const n of nodesToPatch) {
                if (originalAssertWritables.has(n)) {
                    n.assertWritable = originalAssertWritables.get(n);
                } else {
                    delete n.assertWritable;
                }

                const wasProtected = originalProtections.get(n);
                n.isProtected = wasProtected;
            }
        }
    } else {
        callback();
    }
}

export function closestInTree<T extends Element = HTMLElement>(node: Element, selector: string) {
    return node.closest<T>(selector) || node.querySelector<T>(selector);
}

export function getContextMenuSource(menu: HTMLElement, targetQ: string) {
    return document.getElementById(menu.closest<HTMLElement>('[aria-labelledby]')!.getAttribute('aria-labelledby')!)!.closest<HTMLElement>(targetQ)!
}

export const DUMMY_ELEMENT = document.createElement("div");