import { CloseButton } from './components/alerts/alerts'
import styles from '@/styles.module.scss'
import { JSX } from '@/jsx-runtime'
import { setNativeTooltip, showNativeTooltip } from '@pulsesync/addon-sdk'

const TOOLTIP_ID = (styles as any).FckCensorTooltip
const CLOSABLE_TOOLTIP_ID = (styles as any).ClosableTooltip

let stopTooltip: (() => void) | undefined

export function createRelativeTooltip(view: HTMLElement, description?: string) {
    removeTooltip()
    const cleanup = setNativeTooltip(view, { content: description ?? view.getAttribute('aria-label') ?? '' })
    const hide = () => removeTooltip()
    view.addEventListener('mouseleave', hide, { once: true })
    view.addEventListener('blur', hide, { once: true })
    stopTooltip = () => {
        cleanup()
        view.removeEventListener('mouseleave', hide)
        view.removeEventListener('blur', hide)
    }
    showNativeTooltip(view)
    return view
}

export function eventHandlerForTooltip(event: MouseEvent | FocusEvent) {
    createRelativeTooltip(event.currentTarget as HTMLElement)
}

export function removeTooltip(id: string = TOOLTIP_ID) {
    if (id === TOOLTIP_ID) {
        stopTooltip?.()
        stopTooltip = undefined
    }
    document.getElementById(id)?.remove()
}

export function ClosableTooltip({
    children,
    id = CLOSABLE_TOOLTIP_ID,
    onclose: onClose = null,
    ...props
}: {
    children: JSX.Child
    id: string
    onclose: null | (() => void)
}) {
    if (!id) id = CLOSABLE_TOOLTIP_ID
    removeTooltip(id)
    const tooltip = (
        <div id={id}>
            <div class="QhR4J536RmNHBB5bZYwF" data-test-id={id} tabindex="-1" role="tooltip" {...props}>
                <div class={`_MWOVuZRvUQdXKTMcOPx Ai2iRN9elHpk_u5splD6 _3_Mxw7Si7j2g4kWjlpR Fqg1VWCJUfasVVxqICeO1 ${styles.Content}`}>
                    <div class="TooltipWithTitle_text__ElBtq">
                        <span class="_MWOVuZRvUQdXKTMcOPx Ai2iRN9elHpk_u5splD6 ZYV27jeWd30QDXu4GhaH TooltipWithTitle_description__HsGcR">
                            {children}
                        </span>
                    </div>
                    <div class={styles.TooltipButtons}>
                        <CloseButton
                            onclick={() => {
                                removeTooltip()
                                removeTooltip(id)
                                onClose != null && onClose()
                            }}
                            onmouseenter={eventHandlerForTooltip}
                            aria-label="Скрыть и больше не показывать"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
    return tooltip
}

export function createClosableTooltip(
    description: string,
    x: Number,
    y: number,
    id: string = CLOSABLE_TOOLTIP_ID,
    onClose: null | (() => void) = null,
) {
    const tooltip = (
        <ClosableTooltip id={id} onclose={onClose}>
            {description}
        </ClosableTooltip>
    )
    document.body.appendChild(tooltip)
    tooltip.style.translate = `${x}px ${y}px`
    return tooltip
}

export function createRelativeClosableTooltip(
    view: HTMLElement,
    description?: string,
    id: string = CLOSABLE_TOOLTIP_ID,
    onClose: null | (() => void) = null,
) {
    const rect = view.getBoundingClientRect()
    return createClosableTooltip(description ?? view.ariaLabel!, rect.x + rect.width, rect.y + rect.height, id, onClose)
}

export function eventHandlerForClosableTooltip(event: MouseEvent) {
    const view = event.currentTarget as HTMLElement
    const id = view.getAttribute('tooltip-id') ?? CLOSABLE_TOOLTIP_ID
    createRelativeTooltip(view, id)
    view.addEventListener('mouseleave', () => removeTooltip(id), { once: true })
}
