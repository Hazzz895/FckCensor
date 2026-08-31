import { CloseButton } from "./components/alerts/alerts";
import { debug } from "@/utils/logger";
import { anchorElement, BOTTOM, LEFT, RIGHT, TOP } from "@/utils/ui-utils";
import styles from '@/styles.module.scss'

const TOOLTIP_ID = (styles as any).FckCensorTooltip

export function createTooltipInternal(description: string) {
    removeTooltip()
    const tooltip = (
        <div class="QhR4J536RmNHBB5bZYwF TooltipWithTitle_root__7jLY3" 
             data-test-id="TOOLTIP_WITH_TITLE" 
             tabindex="-1"
             role="tooltip" 
             id={TOOLTIP_ID}
             onmouseenter={removeTooltip}>
                <div class="_MWOVuZRvUQdXKTMcOPx Ai2iRN9elHpk_u5splD6 _3_Mxw7Si7j2g4kWjlpR Fqg1VWCJUfasVVxqICeO">
                    <div class="TooltipWithTitle_text__ElBtq">
                        <span class="_MWOVuZRvUQdXKTMcOPx Ai2iRN9elHpk_u5splD6 ZYV27jeWd30QDXu4GhaH TooltipWithTitle_description__HsGcR">
                            {description}
                        </span>
                    </div>
                </div>
        </div>
    )
    document.body.appendChild(tooltip);
    return tooltip;
}

export function createTooltip(description: string, x: Number, y: number) {
    const tooltip = createTooltipInternal(description)
    tooltip.style.translate = `${x}px ${y}px`
    return tooltip
}

export function createRelativeTooltip(view: HTMLElement, description?: string) {
    const rect = view.getBoundingClientRect()
    return createTooltip(description ?? view.ariaLabel!, rect.x + rect.width, rect.y + rect.height); 
}

export function eventHandlerForTooltip(event: MouseEvent) {
    const view = event.target as HTMLElement
    createRelativeTooltip(view, undefined)
    view.addEventListener("mouseleave", () => removeTooltip())
}

export function removeTooltip(id: string = TOOLTIP_ID) {
    document.getElementById(id)?.remove();
}

export function createClosableTooltipInternal(description: string, id: string = TOOLTIP_ID, onClose: null | (() => void) = null) {
    removeTooltip(id)
    const tooltip = (
    <div id={id}>
        <div class="QhR4J536RmNHBB5bZYwF" 
             data-test-id={id}
             tabindex="-1"
             role="tooltip">
                <div class={`_MWOVuZRvUQdXKTMcOPx Ai2iRN9elHpk_u5splD6 _3_Mxw7Si7j2g4kWjlpR Fqg1VWCJUfasVVxqICeO1 ${styles.Content}`}>
                    <div class="TooltipWithTitle_text__ElBtq">
                        <span class="_MWOVuZRvUQdXKTMcOPx Ai2iRN9elHpk_u5splD6 ZYV27jeWd30QDXu4GhaH TooltipWithTitle_description__HsGcR">
                            {description}
                        </span>
                    </div>
                    <div class={styles.TooltipButtons}>
                        <CloseButton onclick={() => { removeTooltip(id); onClose != null && onClose() }} onmouseenter={eventHandlerForTooltip} aria-label="Скрыть и больше не показывать"/>
                    </div>
                </div>
        </div>
    </div>)
    document.body.appendChild(tooltip) 
    return tooltip
}

export function createClosableTooltip(description: string, x: Number, y: number, id: string = TOOLTIP_ID, onClose: null | (() => void) = null) {
    const tooltip = createClosableTooltipInternal(description, id, onClose)
    tooltip.style.translate = `${x}px ${y}px`
    return tooltip
}

export function createRelativeClosableTooltip(view: HTMLElement, description?: string, id: string = TOOLTIP_ID, onClose: null | (() => void) = null) {
    const rect = view.getBoundingClientRect()
    return createClosableTooltip(description ?? view.ariaLabel!, rect.x + rect.width, rect.y + rect.height, id, onClose); 
}

export function eventHandlerForClosableTooltip(event: MouseEvent) {
    const view = event.target as HTMLElement
    const id = view.getAttribute("tooltip-id") ?? TOOLTIP_ID
    createRelativeTooltip(view, id)
    view.addEventListener("mouseleave", () => removeTooltip(id))
}