import { Q_FULLSCREEN_CONTENT } from '@/hooks/ui/constants'
import { listenAddNodes, unlistenAddNodes } from '@/hooks/ui/observer'
import { DevPanelOption } from './options'
import ElementWrap from '@/ui/components/ElementWrap'
import { ActionButton } from '@/ui/components/alerts/alerts'
import { CensoredFragment, generateCensoredTrackLyricsFragments } from '@/dev/moderation/api/ai-lyrics-moderation'
import { Track } from '@/types'
import { debug, error } from '@/utils/logger'
import { lrcLineToTimestamp } from '@/utils/music'
import { getReports, Report } from './api/moderation-reports-api'
import { setProgress } from '@/utils/pulsesync'
import { getSdkApi } from '@/sdk/lifecycle'

let fullscreenListener: any = null

export function toggleModMenu(value: boolean) {
    if (value == !!fullscreenListener) return

    if (value) {
        fullscreenListener = listenAddNodes(fullscreen => {
            if (fullscreen.hasAttribute('moderation_fullscreen')) return
            addModMenuToFullscreen(fullscreen)
        }, Q_FULLSCREEN_CONTENT)
    } else {
        unlistenAddNodes(fullscreenListener)
        fullscreenListener = null
    }
}

function addModMenuToFullscreen(fullscreen: HTMLElement) {
    fullscreen.setAttribute('moderation_fullscreen', 'true')
    fullscreen.appendChild(<DevPanelOption style="position: absolute; top: 0; left: 0;">Режим модерации</DevPanelOption>)

    fullscreen.appendChild(new AiAnaliticsMenuWindow().element)
    const reportsWindow = new ReportsWindow()
    reportsWindow.x = 300
    fullscreen.appendChild(reportsWindow.element)
}

abstract class MenuWindow extends ElementWrap {
    declare private windowTitleBar: MenuWindowTitleBar
    declare private content: HTMLElement

    private _x: number = 0
    private _y: number = 50

    get x() {
        return this._x
    }

    set x(value: number) {
        this._x = value
        this.element.style.left = `${value}px`
    }

    get y() {
        return this._y
    }

    set y(value: number) {
        this._y = value
        this.element.style.top = `${value}px`
    }

    protected createElement(): HTMLElement {
        return (
            <div style={`z-index:99999; position: absolute; left: ${this._x}px; top: ${this._y}px`}>
                {(this.windowTitleBar = new MenuWindowTitleBar(this)).element}
                <div style="background: black; max-width: 60vw; max-height: 60vh;">{(this.content = this.createContent())}</div>
            </div>
        )
    }

    private _minimized = false

    public get minimized() {
        return this._minimized
    }

    public set minimized(value: boolean) {
        this._minimized = value
        if (value) {
            this.content.parentElement!.style.display = 'none'
        } else {
            this.content.parentElement!.style.display = 'block'
        }
    }

    protected abstract createContent(): HTMLElement

    constructor(public title: string) {
        super()
    }
}

class MenuWindowTitleBar extends ElementWrap {
    private _title: string

    get title() {
        return this._title
    }

    set title(value: string) {
        this._title = value
        this.window.title = value
        this.reRenderElement()
    }

    protected createElement(): HTMLElement {
        return (
            <div
                onpointerdown={this.pointerDown.bind(this)}
                onpointermove={this.pointerMove.bind(this)}
                onpointerup={this.pointerUp.bind(this)}
                onpointercancel={this.pointerUp.bind(this)}
                style={`padding: 4px 16px; user-select: none; cursor: grab; background: darkslategray; color: white; display: flex; gap: 16px; justify-content: space-between; align-items: center`}
            >
                <span>{this._title}</span>
                <button
                    style="width: 2.875rem; height: 2rem"
                    type="button"
                    onclick={() => (this.window.minimized = !this.window.minimized)}
                    class="TitleBar_button__9MptL"
                    aria-label="Свернуть"
                >
                    <svg width="10" height="1" viewBox="0 0 10 1" xmlns="http://www.w3.org/2000/svg" class="TitleBar_icon__8Wji9">
                        <path
                            d="M0.498047 1C0.429688 1 0.364583 0.986979 0.302734 0.960938C0.244141 0.934896 0.192057 0.899089 0.146484 0.853516C0.100911 0.807943 0.0651042 0.755859 0.0390625 0.697266C0.0130208 0.635417 0 0.570312 0 0.501953C0 0.433594 0.0130208 0.370117 0.0390625 0.311523C0.0651042 0.249674 0.100911 0.195964 0.146484 0.150391C0.192057 0.101562 0.244141 0.0641276 0.302734 0.0380859C0.364583 0.0120443 0.429688 -0.000976562 0.498047 -0.000976562H9.50195C9.57031 -0.000976562 9.63379 0.0120443 9.69238 0.0380859C9.75423 0.0641276 9.80794 0.101562 9.85352 0.150391C9.89909 0.195964 9.9349 0.249674 9.96094 0.311523C9.98698 0.370117 10 0.433594 10 0.501953C10 0.570312 9.98698 0.635417 9.96094 0.697266C9.9349 0.755859 9.89909 0.807943 9.85352 0.853516C9.80794 0.899089 9.75423 0.934896 9.69238 0.960938C9.63379 0.986979 9.57031 1 9.50195 1H0.498047Z"
                            fill="currentColor"
                        ></path>
                    </svg>
                </button>
            </div>
        )
    }

    private draggingPointerId: number | null = null
    private startX: number = 0
    private startY: number = 0
    private windowStartX: number = 0
    private windowStartY: number = 0

    private pointerDown(ev: PointerEvent) {
        if (ev.button !== 0 || (ev.target instanceof Element && ev.target.closest('button'))) return

        this.draggingPointerId = ev.pointerId
        this.element.style.cursor = 'grabbing'
        this.element.setPointerCapture(ev.pointerId)
        this.startX = ev.clientX
        this.startY = ev.clientY
        this.windowStartX = this.window.x
        this.windowStartY = this.window.y
    }

    private pointerMove(ev: PointerEvent) {
        if (ev.pointerId !== this.draggingPointerId) return

        this.window.x = this.windowStartX + ev.clientX - this.startX
        this.window.y = this.windowStartY + ev.clientY - this.startY
    }

    private pointerUp(ev: PointerEvent) {
        if (ev.pointerId !== this.draggingPointerId) return

        this.draggingPointerId = null
        this.element.style.cursor = 'grab'
    }

    constructor(private readonly window: MenuWindow) {
        super()
        this._title = this.window.title
    }
}

class AiAnaliticsMenuWindow extends MenuWindow {
    declare private resultsList: AiAnaliticsResultList
    protected createContent(): HTMLElement {
        return (
            <div style="min-width: 250px; min-height: 250px; display: grid; grid-template-rows: 1fr auto">
                {(this.resultsList = new AiAnaliticsResultList()).element}
                <ActionButton onclick={this.onCheck.bind(this)}>Проверить на цензуру через ИИ</ActionButton>
            </div>
        )
    }

    private async onCheck(ev: MouseEvent) {
        const currentTrack = (await getSdkApi()?.player.getSnapshot())?.track
        if (!currentTrack) return

        const button = ev.currentTarget as HTMLButtonElement
        button.disabled = true

        try {
            const fragments = await generateCensoredTrackLyricsFragments(currentTrack as Track)
            debug('Fragments', fragments)
            this.resultsList.results = fragments
        } catch (e: any) {
            error(e)
            this.resultsList.placeholder = e?.message
        } finally {
            button.disabled = false
        }
    }

    constructor() {
        super('ИИ-анализ')
    }
}

class AiAnaliticsResultList extends ElementWrap {
    private onTimestampClick(ev: MouseEvent, result: CensoredFragment) {
        if (!result.timestamp) return
        const parsed = lrcLineToTimestamp(result.timestamp) / 1000
        setProgress(parsed - 1)
    }

    protected createElement(): HTMLElement {
        const rows = this._results.length ? (
            this._results.map((r, i) => {
                const levelColor = r.level === 'high' ? '#fca5a5' : r.level === 'medium' ? '#fbbf24' : r.level === 'low' ? '#93c5fd' : 'black'
                const levelBg =
                    r.level === 'high'
                        ? 'rgba(239, 68, 68, 0.18)'
                        : r.level === 'medium'
                          ? 'rgba(251, 191, 36, 0.18)'
                          : r.level === 'low'
                            ? 'rgba(59, 130, 246, 0.18)'
                            : 'white'

                return (
                    <tr key={i} style="transition: background 0.2s ease;">
                        <td style="padding: 0.75rem 0.875rem; border-bottom: 1px solid rgba(148, 163, 184, 0.18); vertical-align: top;">
                            <span
                                style={`display: inline-flex; align-items: center; justify-content: center; min-width: 2rem; padding: 0.25rem 0.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700; background: ${levelBg}; color: ${levelColor};`}
                            >
                                {r.level}
                            </span>
                        </td>
                        <td style="padding: 0.75rem 0.875rem; border-bottom: 1px solid rgba(148, 163, 184, 0.18); vertical-align: top; color: #f8fafc; word-break: break-word; line-height: 1.45;">
                            {r.text}
                        </td>
                        <td style="padding: 0.75rem 0.875rem; border-bottom: 1px solid rgba(148, 163, 184, 0.18); vertical-align: top; color: #cbd5e1; word-break: break-word; line-height: 1.45;">
                            {r.reason || '—'}
                        </td>
                        <td style="padding: 0.75rem 0.875rem; border-bottom: 1px solid rgba(148, 163, 184, 0.18); vertical-align: top;">
                            <span style="display: inline-flex; align-items: center; padding: 0.25rem 0.6rem; border-radius: 999px; background: rgba(148, 163, 184, 0.12); color: #e2e8f0; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.02em;">
                                {r.category || '—'}
                            </span>
                        </td>
                        <td style="padding: 0.75rem 0.875rem; border-bottom: 1px solid rgba(148, 163, 184, 0.18); vertical-align: top;">
                            <button
                                onclick={(ev: any) => this.onTimestampClick(ev, r)}
                                style="display: inline-flex; align-items: center; padding: 0.25rem 0.6rem; border-radius: 999px; background: rgba(148, 163, 184, 0.12); color: #e2e8f0; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.02em;"
                            >
                                {r.timestamp || 'нет таймкода'}
                            </button>
                        </td>
                    </tr>
                )
            })
        ) : (
            <tr>
                <td colspan={4} style={'padding: 1.25rem 1rem; text-align: center; color:' + (this.placeholder ? 'red' : ' color: #94a3b8;')}>
                    {this.placeholder || 'Нет результатов'}
                </td>
            </tr>
        )

        return (
            <div style="max-height: 42vh; overflow: auto; background: rgba(15, 23, 42, 0.9); border-top: 1px solid rgba(148, 163, 184, 0.2); border-bottom: 1px solid rgba(148, 163, 184, 0.2);">
                <table style="width: 100%; border-collapse: collapse; table-layout: fixed; color: #e2e8f0; font-size: 0.8rem;">
                    <thead style="position: sticky; top: 0; z-index:1; background: rgba(15, 23, 42, 0.98);">
                        <tr>
                            <th style="padding: 0.75rem 0.875rem; text-align: left; font-size: 0.68rem; letter-spacing: 0.08em; text-transform: uppercase; color: #94a3b8; border-bottom: 1px solid rgba(148, 163, 184, 0.22);">
                                У
                            </th>
                            <th style="padding: 0.75rem 0.875rem; text-align: left; font-size: 0.68rem; letter-spacing: 0.08em; text-transform: uppercase; color: #94a3b8; border-bottom: 1px solid rgba(148, 163, 184, 0.22);">
                                Фрагмент
                            </th>
                            <th style="padding: 0.75rem 0.875rem; text-align: left; font-size: 0.68rem; letter-spacing: 0.08em; text-transform: uppercase; color: #94a3b8; border-bottom: 1px solid rgba(148, 163, 184, 0.22);">
                                Причина
                            </th>
                            <th style="padding: 0.75rem 0.875rem; text-align: left; font-size: 0.68rem; letter-spacing: 0.08em; text-transform: uppercase; color: #94a3b8; border-bottom: 1px solid rgba(148, 163, 184, 0.22);">
                                Категория
                            </th>
                            <th style="padding: 0.75rem 0.875rem; text-align: left; font-size: 0.68rem; letter-spacing: 0.08em; text-transform: uppercase; color: #94a3b8; border-bottom: 1px solid rgba(148, 163, 184, 0.22);">
                                Таймкод
                            </th>
                        </tr>
                    </thead>
                    <tbody>{rows}</tbody>
                </table>
            </div>
        )
    }

    private _placeholder?: string

    public set placeholder(value: string | undefined) {
        this._placeholder = value
        this.reRenderElement()
    }

    public get placeholder() {
        return this._placeholder
    }

    private _results: CensoredFragment[] = []

    public set results(value: CensoredFragment[]) {
        this._results = value
        this.placeholder = undefined
        this.reRenderElement()
    }

    public get results() {
        return this._results
    }
}

class ReportsWindow extends MenuWindow {
    private readonly resultsList = new ReportsResultList()

    protected createContent(): HTMLElement {
        return <div style="min-width: 250px; min-height: 250px;">{this.resultsList.element}</div>
    }

    constructor() {
        super('Сообщения о цензуре')
        void this.loadReports()
    }

    private async loadReports() {
        try {
            this.resultsList.reports = await getReports()
        } catch (e: unknown) {
            error(e)
            this.resultsList.placeholder = e instanceof Error ? e.message : String(e)
        }
    }
}

class ReportsResultList extends ElementWrap {
    protected createElement(): HTMLElement {
        const rows = this._reports.length ? (
            this._reports.map(report => (
                <tr key={report.id}>
                    <td style="padding: 0.75rem 0.875rem; border-bottom: 1px solid rgba(148, 163, 184, 0.18);">{report.id}</td>
                    <td style="padding: 0.75rem 0.875rem; border-bottom: 1px solid rgba(148, 163, 184, 0.18);">
                        {new Date(report.created_at).toLocaleString()}
                    </td>
                    <td style="padding: 0.75rem 0.875rem; border-bottom: 1px solid rgba(148, 163, 184, 0.18);">{report.track_id}</td>
                    <td style="padding: 0.75rem 0.875rem; border-bottom: 1px solid rgba(148, 163, 184, 0.18);">{report.replaced ? 'Да' : 'Нет'}</td>
                    <td style="padding: 0.75rem 0.875rem; border-bottom: 1px solid rgba(148, 163, 184, 0.18);">{report.type}</td>
                </tr>
            ))
        ) : (
            <tr>
                <td colspan={5} style={`padding: 1.25rem 1rem; text-align: center; color: ${this._placeholder ? 'red' : '#94a3b8'};`}>
                    {this._placeholder || 'Нет сообщений о цензуре'}
                </td>
            </tr>
        )

        return (
            <div style="max-height: 42vh; overflow: auto; background: rgba(15, 23, 42, 0.9); border-top: 1px solid rgba(148, 163, 184, 0.2); border-bottom: 1px solid rgba(148, 163, 184, 0.2);">
                <table style="width: 100%; border-collapse: collapse; color: #e2e8f0; font-size: 0.8rem;">
                    <thead style="position: sticky; top: 0; z-index: 1; background: rgba(15, 23, 42, 0.98);">
                        <tr>
                            <th style="padding: 0.75rem 0.875rem; text-align: left; color: #94a3b8;">ID</th>
                            <th style="padding: 0.75rem 0.875rem; text-align: left; color: #94a3b8;">Дата</th>
                            <th style="padding: 0.75rem 0.875rem; text-align: left; color: #94a3b8;">ID трека</th>
                            <th style="padding: 0.75rem 0.875rem; text-align: left; color: #94a3b8;">Заменено</th>
                            <th style="padding: 0.75rem 0.875rem; text-align: left; color: #94a3b8;">Тип</th>
                        </tr>
                    </thead>
                    <tbody>{rows}</tbody>
                </table>
            </div>
        )
    }

    private _placeholder?: string = 'Загрузка отчетов...'

    public set placeholder(value: string | undefined) {
        this._placeholder = value
        this.reRenderElement()
    }

    private _reports: Report[] = []

    public set reports(value: Report[]) {
        this._reports = value
        this._placeholder = undefined
        this.reRenderElement()
    }
}
