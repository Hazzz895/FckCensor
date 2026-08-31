import { debug, error } from "@/utils/logger";
import { getTrackIdFromNode } from "@/utils/ui-utils";
import { Q_TRACK_ROOT } from "./constants";

let mutationCallbacks: ((mutation: MutationRecord) => void)[] = []
let addedNodeCallbacks: [((el: HTMLElement) => void), selector?: string][] = []
let removedNodeCallbacks: [((el: HTMLElement) => void), selector?: string][] = []

function safeExecute(x: Function, ...args: any[]) {
    try { x(...args) } catch (e) { error("Error in mutation observer", e) }
}

const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
        mutationCallbacks.forEach(x => safeExecute(x, mutation))

        removedNodeCallbacks.forEach(([x, selector]) => mutation.removedNodes.forEach(node => {
            if (!(node instanceof HTMLElement)) return;
            if (!selector) { safeExecute(x, node); return; }
            if (node.matches(selector)) safeExecute(x, node);
            node.querySelectorAll(selector).forEach(el => safeExecute(x, el));
        }))

        addedNodeCallbacks.forEach(([x, selector]) => mutation.addedNodes.forEach(node => {
            if (!(node instanceof HTMLElement)) return;
            if (!selector) { safeExecute(x, node); return; }
            if (node.matches(selector)) safeExecute(x, node);
            node.querySelectorAll(selector).forEach(el => safeExecute(x, el));
        }))
    });
})
observer.observe(document.body, { childList: true, subtree: true })

export function listenMutations(listener: (mutation: MutationRecord) => void) {
    mutationCallbacks.push(listener); 
    return listener
}

export function listenAddNodes(listener: (el: HTMLElement) => void, selector?: string) {
    addedNodeCallbacks.push([listener, selector]);
    return listener
}

export function unlistenAddNodes(listener: (el: HTMLElement) => void) {
    addedNodeCallbacks = addedNodeCallbacks.filter(x => x[0] !== listener)
}

export function listenRemovedNodes(listener: (el: HTMLElement) => void, selector?: string) {
    removedNodeCallbacks.push([listener, selector]);
    return listener
}

export function unlistenRemovedNodes(listener: (el: HTMLElement) => void) {
    removedNodeCallbacks = removedNodeCallbacks.filter(x => x[0] !== listener)
}

export function listenAddTrackNodes(listener: (el: HTMLElement, trackId: string) => void, selector?: string) {
    return listenAddNodes((el) => {
        const trackId = getTrackIdFromNode(el);
        if (!trackId) return;
        listener(el, String(trackId));
    }, Q_TRACK_ROOT + (selector ?? ""))
}

export function invokeAddNodesListeners() {
    addedNodeCallbacks.forEach(([x, selector]) => selector && document.querySelectorAll(selector).forEach(node => safeExecute(x, node)))
}