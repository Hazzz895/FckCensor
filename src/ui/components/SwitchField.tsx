import { SpoofAlertBase } from './alerts/spoof/base/SpoofAlertBase'
import { SpoofAlertEntityPropertyField } from './alerts/spoof/base/SpoofAlertEntityPropertyField'
import ElementWrap from './ElementWrap'
import { IGetValue } from './IGetValue'
import styles from '@/styles.module.scss'

export class SwitchField extends SpoofAlertEntityPropertyField<boolean> {
    public constructor(
        alert: SpoofAlertBase,
        protected _label: string,
        propertyName?: string,
        private _value: boolean = false,
        private _disabled: boolean = false
    ) {
        super(alert, propertyName, _value)
    }

    set disabled(v: boolean) {
        this._disabled = v
        this.updateSwitchButtonState();
        this.updateLabel();
    }

    get disabled() {
        return this._disabled
    }

    set value(v: boolean) {
        this._value = v
        this.updateSwitchButtonState()
    }

    get value() {
        return this._value
    }

    set label(v: string) {
        this._label = v
        this.updateLabel();
    }

    get label() {
        return this._label
    }

    private switchButton?: HTMLElement

    private labelElement?: HTMLElement

    protected createElement(): HTMLElement {
        const el = (
            <div class={styles.Switch + " EditContentModal_field__rexIL"}>
                <div class={styles.Switch}>
                    {this.labelElement = <div
                        class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI V3WU123oO65AxsprotU9 Vi7Rd0SZWqD17F0872TB"
                        aria-hidden="true"
                        style="-webkit-line-clamp: 1;"/>}
                </div>
                {this.switchButton = <button
                    class="cpeagBA1_PblpJn8Xgtv _eTRQi5ADZCUvUKMZqJU zIMibMuH7wcqUoW7KH1B IlG7b1K0AD7E7AMx6F5p rWukOKAJh5Ga7JuIp62L undefined qU2apWBO1yyEK0lZ3lPO rqUESGQ8jp3tbDawOzuG GJh5PwV9GyFuKhlG6pQz"
                    type="button"
                    role="switch"
                    aria-checked={String(this._value)}
                    aria-live="off"
                    aria-busy="false"
                    onclick={() => this.value = !this.value}
                >
                    <span class="JjlbHZ4FaP9EAcR_1DxF">
                        <div class="aw9IoPC0GuAC7Hmf825u KC8t9NStVmQ1_VY54KH4"></div>
                    </span>
                </button>}
            </div>
        )
        this.updateSwitchButtonState();
        this.updateLabel();
        return el
    }

    private updateSwitchButtonState() {
        if (this.switchButton) {
            this.switchButton.setAttribute('aria-checked', String(this.value))
            
            const enabledDisabled = [["_eTRQi5ADZCUvUKMZqJU", "_eTRQi5ADZCUvUKMZqJU"], ["iJVAJMgccD4vj4E4o068", "nHWc2sto1C6Gm0Dpw_l0"]]
            this.switchButton.classList.remove(...enabledDisabled[+this.value])
            this.switchButton.classList.add(...enabledDisabled[+!this.value])

            this.switchButton.querySelector("span > div")?.classList.toggle("KC8t9NStVmQ1_VY54KH4", this.value)
            this.switchButton.toggleAttribute("disabled", this.disabled)
        }
    }

    private updateLabel() {
        if (this.labelElement) {
            this.labelElement.textContent = this.label
            this.labelElement.title = this.label
            this.labelElement.parentElement!.toggleAttribute("disabled", this.disabled)
        }
    }

    getValue() {
        return this.value
    }

    hasDiffs(prop: any): boolean {
        return this.value != this.originalValue
    }
}
