import { SpoofAlertEntityPropertyField } from "./SpoofAlertEntityPropertyField";
import { CloseButton, TextField } from "@/ui/components/alerts/alerts";
import { debug } from "@/utils/logger";
import { SpoofAlertBase } from "./SpoofAlertBase";
import styles from "@/styles.module.scss";
import { JSX } from "@/jsx-runtime";
import { getJsonValidationError, isNumeric } from "@/utils/common";

export default class SpoofAlertCustomPropertyField extends SpoofAlertEntityPropertyField<any> {
    public constructor(alert: SpoofAlertBase) {
        super(alert)
    }

    private propertyNameField: HTMLElement = null!;
    private propertyValueField: HTMLElement = null!;
    private propertyTypeField: HTMLSelectElement = null!;

    createElement(): HTMLElement {
        this.propertyNameField = <TextField list="FckCensorEntityPropertiesList" oninput={this.onPropertyNameChanged.bind(this)} placeholder="Название"/>;
        
        this.propertyValueField = <TextField oninput={this.onValueChanged.bind(this)}  placeholder="Значение"/>
        this.propertyTypeField = <select onchange={this.onTypeChanged.bind(this)} class={"EditContentModal_field__rexIL EditContentModal_input__8O8GH " + styles.i}>
                                    <option value="string">Строка</option>
                                    <option value="number">Число</option>
                                    <option value="boolean">Логическое</option>
                                    <option value="json">JSON</option>
                                </select> as any;

        function onClose(this: SpoofAlertCustomPropertyField) {
            this.alert.removePropertyField(this);
            this.element.remove()
        }

        const x = <CloseButton onclick={onClose.bind(this)} style="align-self: center"/>
        x.classList.add("EditContentModal_field__rexIL")

        return <div class={styles.AddSpoofAlertFieldFieldGrid}>
            {x}
            {this.propertyNameField}
            <datalist id="FckCensorEntityPropertiesList">
                {Object.keys(this.alert.entity).map(x => x === "id" ? undefined : <option value={x}>x</option>)}
            </datalist>
            {this.propertyValueField}
            {this.propertyTypeField}
        </div>;
    }

    public getInputValue() {
        return this.propertyValueField.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea')!.value;
    }

    private onTypeChanged(_: Event) {
        this.validateType();
    }

    private onValueChanged(ev: InputEvent) {
        this.validateType()
    }

    private getTypeConverter() {
        switch (this.getType()) {
            case "number":
                return Number;
            case "boolean":
                return (s: string) => s == "true";
            case "json": 
                return JSON.parse
            default:
                return String
        }
    }   

    public getValidationError() {
        let error: string | null = null;

        const type = this.getType();

        if (type !== "string") {
            const value = this.getInputValue();
            if (!["null", "undefined"].includes(value)) {
                switch (type) {
                    case "number":
                        error = isNumeric(value) ? null :"Значение должно быть числом";
                        break;
                    case "boolean":
                        error = ["true", "false"].includes(value) ? null : "Значение должно быть либо true, либо false";
                        break;
                    case "json":
                        error = getJsonValidationError(value);
                        break;
                    default:
                        error = null;
                        break;
                }
            }
        }

        return error;
    }

    private validateType() {
        const error = this.getValidationError();
        const fits = !error;

        const input = this.propertyValueField.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea')!
        input.classList.toggle("EditContentModal_input_error__fxTOr", !fits);
        input.classList.toggle("kAYDswAvA1AJoAzRV4rY", fits);

        let errorLabel = this.propertyValueField.querySelector<HTMLElement>('[data-test-id="ERROR_LABEL"]');
        if (!fits) {
            if (!errorLabel) {
                errorLabel = <div class="_MWOVuZRvUQdXKTMcOPx Ai2iRN9elHpk_u5splD6 _3_Mxw7Si7j2g4kWjlpR" data-test-id="ERROR_LABEL" style="color: var(--ym-message-color-error-text-enabled); margin-block-start: var(--ym-spacer-size-xs);"/>;
                this.propertyValueField.appendChild(errorLabel);
            }
            errorLabel.textContent = error;
        } else if (errorLabel) {
            errorLabel.remove();
        }
    }

    public setPropertyName(propertyName: string) {
        this.propertyName = propertyName;
        this.propertyNameField.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea')!.value = propertyName;
        this.setPropertyNameInternal(propertyName) 
    }

    public setSavedValue(propertyName: string, value: any) {
        this.propertyName = propertyName;
        this.propertyNameField.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea')!.value = propertyName;

        const type: "string" | "boolean" | "number" | "json" =
            (["string", "boolean", "number"].includes(typeof value) ? typeof value : "json") as any;
        this.propertyTypeField.value = type;

        const strValue = type === "json" ? JSON.stringify(value) : String(value);
        this.propertyValueField.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea')!.value = strValue;
    }

    private setPropertyNameInternal(propertyName: string) {
        if (propertyName in this.alert.entity) {
            const prop = (this.alert.entity as any)[propertyName];

            let typeValue;
            const type = typeof prop;
            if (["string", "boolean", "number"].includes(type)) {
                typeValue = type;
            }
            else {
                typeValue = "json"
            }

            if (typeValue) {
                this.propertyTypeField.value = typeValue;
            }

            if (prop && !this.getInputValue()) {
                let strProp;
                if (typeValue == "json") {
                    strProp = JSON.stringify(prop);
                }
                else {
                    strProp = String(prop)
                }
                this.propertyValueField.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea')!.value = strProp;
            }
        }
    }

    private onPropertyNameChanged(ev: InputEvent) {
        this.setPropertyNameInternal(this.propertyName = (ev.currentTarget as HTMLTextAreaElement | HTMLInputElement).value.trim());
    }

    getType(): "string" | "boolean" | "number" | "json" {
        return this.propertyTypeField.value as any;
    }

    hasDiffs(prop: any): boolean {
        if (!this.propertyName) return false;

        if (this.getType() != "json") {
            return prop != this.alert.getOriginalValue(this.propertyName);
        }
        else {
            for (const k in prop) {
                if (this.alert.getOriginalValue(this.propertyName) != prop[k]) {
                    return true;
                }
            }
            return false;
        }
    }

    getValue(): any {
        const value = this.getInputValue()

        switch (value) {
            case "undefined":
                return undefined 
            case "null":
                return null;
        }

        return this.getTypeConverter()(value);
    }
}

export function AddSpoofAlertFieldButton({ children, ...props }: JSX.HTMLAttributes) {
    return <button {...props} class={`EditContentModal_input__8O8GH EditContentModal_field__rexIL ${styles.AddSpoofAlertFieldField}`}>{children ?? "Добавить поле"}</button>
}