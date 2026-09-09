import ElementWrap from "./ElementWrap";
import { IGetValue } from "./IGetValue";

export class SwitchField extends ElementWrap implements IGetValue<boolean> {
    public constructor(protected _label: string, protected _value: boolean = false) { super() }

    getValue(): boolean {
        return this._value;
    }

    set value(v: boolean) { 
        this._value = v;
        this.reRenderElement();
    }

    get value() { return this._value }

    set label(v: string) {
        this._label = v; 
        this.reRenderElement(); 
    }

    get label() { return this._label }

    protected createElement(): HTMLElement {
        return <div class="Settings_item__Ksa9h">
            <div class="SettingsListToggleItem_root__yEEYT">
                <div class="SettingsListToggleItem_textContainer__tRjyt">
                    <div title={this._label} class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI V3WU123oO65AxsprotU9 Vi7Rd0SZWqD17F0872TB SettingsListToggleItem_title__Xz8_Q" id="_r_3pm_" aria-hidden="true" style="-webkit-line-clamp: 1;">
                        {this._label}
                    </div>
                </div>
                <button onclick={() => this.value = !this.value} class={"cpeagBA1_PblpJn8Xgtv " + (this._value ? "_eTRQi5ADZCUvUKMZqJU" : "iJVAJMgccD4vj4E4o068") + " zIMibMuH7wcqUoW7KH1B IlG7b1K0AD7E7AMx6F5p " + (this._value ? "rWukOKAJh5Ga7JuIp62L" : "nHWc2sto1C6Gm0Dpw_l0") + "qU2apWBO1yyEK0lZ3lPO rqUESGQ8jp3tbDawOzuG GJh5PwV9GyFuKhlG6pQz"} type="button" role="switch" aria-checked={this._value} aria-live="off" aria-busy="false">
                    <span class="JjlbHZ4FaP9EAcR_1DxF">
                        <div class={"aw9IoPC0GuAC7Hmf825u" + (this._value ? " KC8t9NStVmQ1_VY54KH4" : "")}/>
                    </span>
                </button>
            </div>
        </div>
    }

}