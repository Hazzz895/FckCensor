import { listenAddNodes } from "@/hooks/ui/observer";
import { JSX } from "@/jsx-runtime";
import { isUserModeration } from "../dev-utils";
import { isModerationMode, setIsModerationMode } from "./admin";
import { debug } from "@/utils/logger";

export function prepareModerationOptions() {
    listenAddNodes((devPanel) => {
        updateModerationModeOption(devPanel);
    }, ".DevPanel_panel__LnoO2")
}

function updateModerationModeOption(panel: HTMLElement) {
    let button = panel.querySelector('[data-test-id="MODERATION_MODE"]');
    if (!button) {
        button = <DevPanelOption data-test-id="MODERATION_MODE" onclick={() => {
            setIsModerationMode(!isModerationMode());
            updateModerationModeOption(panel);
        }}/>
        panel.appendChild(button)
    }
    button.textContent = (isModerationMode() ? "Выключить" : "Включить") + " режим модерации";
}

export function DevPanelOption({ children, ...props }: JSX.HTMLAttributes) {
    return <button 
        class="cpeagBA1_PblpJn8Xgtv iJVAJMgccD4vj4E4o068 dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p nHWc2sto1C6Gm0Dpw_l0 oR11LfCBVqMbUJiAgknd qU2apWBO1yyEK0lZ3lPO BbCxxIjBGupN28bq2lSP DevPanel_block__SJ_76" type="button" aria-live="off" aria-busy="false" {...props}>
            {children}
        </button>
}