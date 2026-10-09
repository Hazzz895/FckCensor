import { JSX } from '@/jsx-runtime'
import { getSdkApi } from '@/sdk/lifecycle'
import styles from '@/styles.module.scss'
import addonConfig from '../../../../addon.config.mjs'

const modalClosers = new WeakMap<Element, () => void>()

export function AlertRoot({ children }: JSX.HTMLAttributes) {
    return (
        <div
            tabindex="-1"
            role="dialog"
            aria-modal="true"
            class="ifxS_8bgSnwBoCsyow0E t7tk8IYH3tGrhDZJpi3Z GKgBufCxWa9erUCTU3Fp mjhMCLd6OX1d1_cJo5Cm"
        >
            {children}
        </div>
    )
}

interface AlertHeaderProps extends JSX.HTMLAttributes {
    title?: string
}

export function CloseButton({ onclick, ...props }: Record<string, any>) {
    return (
        <button
            class={`cpeagBA1_PblpJn8Xgtv iJVAJMgccD4vj4E4o068 uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p nHWc2sto1C6Gm0Dpw_l0 oR11LfCBVqMbUJiAgknd qU2apWBO1yyEK0lZ3lPO YUY9QjXr1E4DQfQdMjGt ${styles.CloseButton}`}
            type="button"
            aria-label="Закрыть"
            aria-live="off"
            aria-busy="false"
            onclick={onclick}
            {...props}
            data-scrim-close-button="true"
        >
            <span class="JjlbHZ4FaP9EAcR_1DxF">
                <svg class="J9wTKytjOWG73QMoN5WP l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
                    <use xlink:href="/icons/sprite.svg#close_xxs"></use>
                </svg>
            </span>
        </button>
    )
}

export function AlertHeader({ title, children }: AlertHeaderProps) {
    return (
        <header class="EditContentModal_header__F6BJQ" data-scrim-header="true">
            <h3 class="_MWOVuZRvUQdXKTMcOPx _sd8Q9d_Ttn0Ufe4ISWS nSU6fV9y80WrZEfafvww xuw9gha2dQiGgdRcHNgU">{title ?? children}</h3>
            <CloseButton />
        </header>
    )
}

export function AlertContentRoot({ children }: JSX.HTMLAttributes) {
    return <div class={`EditContentModal_content__6yEGM ${styles.AlertContent}`}>{children}</div>
}

export function AlertButtons({ children }: JSX.HTMLAttributes) {
    return <div class={`EditContentModal_buttons__bHzfS ${styles.AlertButtons}`}>{children}</div>
}

export interface ActionButtonProps extends JSX.HTMLAttributes {
    onclick?: (ev: MouseEvent) => void
}

export function ActionButton({ children, onclick, class: className, ...props }: ActionButtonProps) {
    return (
        <button
            class={`cpeagBA1_PblpJn8Xgtv _eTRQi5ADZCUvUKMZqJU zIMibMuH7wcqUoW7KH1B IlG7b1K0AD7E7AMx6F5p Y2uqxoU7xa_AZ8FUCVOW qU2apWBO1yyEK0lZ3lPO ${className ?? ''}`}
            type="button"
            aria-live="off"
            aria-busy="false"
            onclick={onclick}
            {...props}
        >
            {children}
        </button>
    )
}

export function AlertBackground() {
    return (
        <div
            class="l66GiFKS1Ux_BNd603Cu NaZE1NCUxSM1MvpZuLJV"
            style="position: fixed; overflow: auto; inset: 0px;"
            aria-hidden="true"
            data-scrim-backdrop="true"
        />
    )
}

interface ScrimAlertProps extends JSX.HTMLAttributes {
    scrimElement?: JSX.Element
    x?: number
    y?: number
    height?: number
    width?: number
}

export function closeAlert(el: HTMLElement) {
    const target = el.closest('[data-scrim-modal]') || el.querySelector('[data-scrim-modal]')
    if (target) modalClosers.get(target)?.()
}

function forceReflow(el: HTMLElement) {
    void el.offsetWidth
}

export function ScrimAlert({ scrimElement, x, y, width, height, children }: ScrimAlertProps) {
    return (
        <div class={styles.AlertFromScrim} data-scrim-modal="true">
            {children}
        </div>
    )
}

export function createScrimAlert(
    scrimElement: JSX.Element | undefined,
    title: string,
    content?: JSX.Child,
    onClose?: () => void,
    buttons?: JSX.Child,
) {
    const container = (
        <div data-pulsesync-addon-scope={getSdkApi()?.addonId ?? addonConfig.id}>
            <AlertBackground />
            <ScrimAlert scrimElement={scrimElement}>
                <AlertRoot>
                    <AlertHeader title={title} />
                    <AlertContentRoot>{content}</AlertContentRoot>
                    {buttons && <AlertButtons>{buttons}</AlertButtons>}
                </AlertRoot>
            </ScrimAlert>
        </div>
    )

    const previousFocus = document.activeElement
    document.body.appendChild(container)

    const scrimNode = container.querySelector<HTMLElement>('.' + CSS.escape(styles.AlertFromScrim))
    container.querySelector('[role="dialog"]')?.setAttribute('aria-label', title)
    const headerNode = container.querySelector<HTMLElement>('[data-scrim-header]')
    const closeButton = container.querySelector<HTMLElement>('[data-scrim-close-button]')
    const backdropNode = container.querySelector<HTMLElement>('[data-scrim-backdrop]')

    if (!scrimNode) {
        return container
    }

    if (headerNode) {
        scrimNode.style.setProperty('--header-height', `${headerNode.offsetHeight}px`)
    }

    scrimNode.style.transition = 'none'

    if (scrimElement instanceof Element) {
        const scrimRect = scrimElement.getBoundingClientRect()
        const targetWidth = scrimNode.offsetWidth || window.innerWidth * 0.75
        const targetHeight = scrimNode.offsetHeight || window.innerHeight * 0.75

        const scrimCenterX = scrimRect.left + scrimRect.width / 2
        const scrimCenterY = scrimRect.top + scrimRect.height / 2

        const dx = scrimCenterX - window.innerWidth / 2
        const dy = scrimCenterY - window.innerHeight / 2
        const scaleX = scrimRect.width ? scrimRect.width / targetWidth : 1
        const scaleY = scrimRect.height ? scrimRect.height / targetHeight : 1

        scrimNode.style.setProperty('--scrim-dx', `${dx}px`)
        scrimNode.style.setProperty('--scrim-dy', `${dy}px`)
        scrimNode.style.setProperty('--scrim-scale-x', `${scaleX}`)
        scrimNode.style.setProperty('--scrim-scale-y', `${scaleY}`)
    }

    forceReflow(scrimNode)

    scrimNode.style.transition = ''

    let closing = false
    let closeTimer: ReturnType<typeof setTimeout> | undefined
    let disposed = false
    let unregisterCleanup: (() => void) | undefined
    const dispose = () => {
        if (disposed) return
        disposed = true
        clearTimeout(closeTimer)
        modalClosers.delete(scrimNode)
        const restoreFocus = container.contains(document.activeElement)
        document.removeEventListener('keydown', onKeyDown)
        window.removeEventListener('wheel', onWheel, true)
        scrimNode.removeEventListener('transitionend', onTransitionEnd)
        container.remove()
        if (restoreFocus && previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
        unregisterCleanup?.()
        onClose?.()
    }
    const close = () => {
        if (disposed || closing) return
        closing = true
        const wasOpen = scrimNode.getAttribute('data-open') === 'true'
        scrimNode.removeAttribute('data-open')
        if (!wasOpen || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            dispose()
        } else {
            // No transform transition is emitted when opened without an anchor.
            closeTimer = setTimeout(dispose, 350)
        }
    }
    const onTransitionEnd = (ev: TransitionEvent) => {
        if (ev.target !== scrimNode || !closing) return
        if (ev.propertyName === 'opacity' || ev.propertyName === 'transform') dispose()
    }
    modalClosers.set(scrimNode, close)

    const onKeyDown = (ev: KeyboardEvent) => {
        if (ev.key === 'Escape') close()
    }

    const onWheel = (ev: WheelEvent) => {
        if (ev.target instanceof Node && scrimNode.contains(ev.target)) {
            ev.stopPropagation()
        }
    }

    closeButton?.addEventListener('click', close)
    backdropNode?.addEventListener('click', close)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('wheel', onWheel, true)
    scrimNode.addEventListener('transitionend', onTransitionEnd)

    unregisterCleanup = getSdkApi()?.onCleanup(dispose)
    requestAnimationFrame(() => {
        if (!disposed && !closing) {
            scrimNode.setAttribute('data-open', 'true')
            container.querySelector<HTMLElement>('[role="dialog"]')?.focus()
        }
    })

    return container
}

export interface TextFieldProps extends JSX.HTMLAttributes {
    header?: JSX.Child | null
    placeholder?: string
    multiline?: boolean
}

export function TextField({ header, placeholder, multiline, children, ...props }: TextFieldProps) {
    const Tag = (props as any).Tag ? (props as any).Tag : multiline ? 'textarea' : 'input'
    delete props.Tag
    return (
        <div class="EditContentModal_field__rexIL">
            {header ? <div class="_MWOVuZRvUQdXKTMcOPx g3qWNP6xl__7qxNmtrvd _3_Mxw7Si7j2g4kWjlpR EditContentModal_label__Cf3Kp">{header}</div> : ''}
            <Tag {...props} class={'kAYDswAvA1AJoAzRV4rY EditContentModal_input__8O8GH ' + styles.i} placeholder={placeholder ?? ''}>
                {children}
            </Tag>
        </div>
    )
}
