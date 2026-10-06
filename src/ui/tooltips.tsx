import { CloseButton } from "./components/alerts/alerts";
import styles from '@/styles.module.scss'
import { debug } from "@/utils/logger";
import { JSX } from "react/jsx-runtime";

const TOOLTIP_ID = (styles as any).FckCensorTooltip
const CLOSABLE_TOOLTIP_ID = (styles as any).ClosableTooltip

export function Tooltip({ children }: React.PropsWithChildren) {
    removeTooltip()
    const tooltip = (
        <div className="QhR4J536RmNHBB5bZYwF TooltipWithTitle_root__7jLY3" 
             data-test-id="TOOLTIP_WITH_TITLE" 
             role="tooltip" 
             id={TOOLTIP_ID}
             onMouseEnter={() => removeTooltip()}>
                <div className="_MWOVuZRvUQdXKTMcOPx Ai2iRN9elHpk_u5splD6 _3_Mxw7Si7j2g4kWjlpR Fqg1VWCJUfasVVxqICeO">
                    <div className="TooltipWithTitle_text__ElBtq">
                        <span className="_MWOVuZRvUQdXKTMcOPx Ai2iRN9elHpk_u5splD6 ZYV27jeWd30QDXu4GhaH TooltipWithTitle_description__HsGcR">
                            {children}
                        </span>
                    </div>
                </div>
        </div>
    )
    //document.body.appendChild(tooltip);
    return tooltip;
}

export function createTooltip(description: string, x: Number, y: number) {
    const tooltip = <Tooltip>{description}</Tooltip>
    document.body.appendChild(tooltip)
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

export function ClosableTooltip({ children, id = CLOSABLE_TOOLTIP_ID, onclose: onClose = null, ...props } : { children: JSX.Child, id: string, onclose: null | (() => void) }) {
    if (!id) id = CLOSABLE_TOOLTIP_ID
    removeTooltip(id)
    const tooltip = (
    <div id={id}>
        <div className="QhR4J536RmNHBB5bZYwF" 
             data-test-id={id}
             tabindex="-1"
             role="tooltip" {...props}>
                <div className={`_MWOVuZRvUQdXKTMcOPx Ai2iRN9elHpk_u5splD6 _3_Mxw7Si7j2g4kWjlpR Fqg1VWCJUfasVVxqICeO1 ${styles.Content}`}>
                    <div className="TooltipWithTitle_text__ElBtq">
                        <span className="_MWOVuZRvUQdXKTMcOPx Ai2iRN9elHpk_u5splD6 ZYV27jeWd30QDXu4GhaH TooltipWithTitle_description__HsGcR">
                            {children}
                        </span>
                    </div>
                    <div className={styles.TooltipButtons}>
                        <CloseButton onclick={() => { removeTooltip(); removeTooltip(id); onClose != null && onClose() }} onmouseenter={eventHandlerForTooltip} aria-label="Скрыть и больше не показывать"/>
                    </div>
                </div>
        </div>
    </div>)
    return tooltip
}

export function createClosableTooltip(description: string, x: Number, y: number, id: string = CLOSABLE_TOOLTIP_ID, onClose: null | (() => void) = null) {
    const tooltip = <ClosableTooltip id={id} onclose={onClose}>{description}</ClosableTooltip>
    document.body.appendChild(tooltip)
    tooltip.style.translate = `${x}px ${y}px`
    return tooltip
}

export function createRelativeClosableTooltip(view: HTMLElement, description?: string, id: string = CLOSABLE_TOOLTIP_ID, onClose: null | (() => void) = null) {
    const rect = view.getBoundingClientRect()
    return createClosableTooltip(description ?? view.ariaLabel!, rect.x + rect.width, rect.y + rect.height, id, onClose); 
}

export function eventHandlerForClosableTooltip(event: MouseEvent) {
    const view = event.target as HTMLElement
    const id = view.getAttribute("tooltip-id") ?? CLOSABLE_TOOLTIP_ID
    createRelativeTooltip(view, id)
    view.addEventListener("mouseleave", () => removeTooltip(id))
}