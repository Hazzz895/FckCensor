import { Q_FULLSCREEN_CONTENT } from "@/hooks/ui/constants";
import { listenAddNodes, unlistenAddNodes } from "@/hooks/ui/observer";
import { debug } from "@/utils/logger";
import { DevPanelOption } from "./options";

let fullscreenListener: any = null;

export function toggleModMenu(value: boolean) {
    if (value == !!fullscreenListener) return;

    if (value) {
        fullscreenListener = listenAddNodes((fullscreen) => {
            if (fullscreen.hasAttribute("moderation_fullscreen")) return;
            fullscreen.setAttribute("moderation_fullscreen", "true")
            fullscreen.appendChild(<DevPanelOption style="position: absolute; top: 0; left: 0;">МОДЕРАЦИИИИЯИЯИЯИЯЯИЯИЯИИ</DevPanelOption>)
        }, Q_FULLSCREEN_CONTENT);
    }
    else {
        unlistenAddNodes(fullscreenListener);
        fullscreenListener = null;
    }
} 