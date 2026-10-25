import ElementWrap from "./ElementWrap";
import styles from "@/styles.module.scss"
import { IGetValue } from "./IGetValue";

class TextField2 extends ElementWrap implements IGetValue<string> {
    public constructor(public placeholder?: string, public header?: string, private value?: string) {
        super();
    }

    private input?: HTMLInputElement

    protected createInput() {
        return this.input = <input class={'kAYDswAvA1AJoAzRV4rY EditContentModal_input__8O8GH ' + styles.i} placeholder={this.placeholder ?? ''}>
            {this.value}
        </input> as unknown as HTMLInputElement
    }

    public getValue() {
        return this.input?.value ?? ''
    }

    public setValue(value: string) {
        this.value = value;
        if (this.input) {
            this.input.value = value
        }
    }

    protected createElement(): HTMLElement {
        return <div class="EditContentModal_field__rexIL">
                    {this.header ? <div class="_MWOVuZRvUQdXKTMcOPx g3qWNP6xl__7qxNmtrvd _3_Mxw7Si7j2g4kWjlpR EditContentModal_label__Cf3Kp">{this.header}</div> : ''}
                    {this.createInput()}
                </div>
    }

    public reRenderElement() {
        this.value = this.getValue()
        return super.reRenderElement()
    }
}