import { SpoofAlertEntityPropertyField } from "./SpoofAlertEntityPropertyField";
import { CloseButton, TextField } from "@/ui/components/alerts/alerts";
import { debug } from "@/utils/logger";
import { SpoofAlertBase } from "./SpoofAlertBase";
import styles from "@/styles.module.scss";

export default class SpoofAlertCustomPropertyField extends SpoofAlertEntityPropertyField {
    public constructor(alert: SpoofAlertBase) {
        super(alert)
    }

    private propertyNameField: HTMLElement = null!;
    private propertyValueField: HTMLElement = null!;
    private propertyTypeField: HTMLSelectElement = null!;

    createElement(): HTMLElement {
        this.propertyNameField = <TextField list="FckCensorEntityPropertiesList" oninput={this.onPropertyNameTextChanged.bind(this)} placeholder="Название"/>;
        
        this.propertyValueField = <TextField placeholder="Значение"/>
        this.propertyTypeField = <select onchange={this.onTypeChange.bind(this)} class={"EditContentModal_field__rexIL EditContentModal_input__8O8GH " + styles.i}>
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
                {Object.keys(this.alert.entity).map(x => <option value={x}>x</option>)}
            </datalist>
            {this.propertyValueField}
            {this.propertyTypeField}
        </div>;
    }

    private getValue() {
        return this.propertyValueField.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea')!.value;
    }

    private onTypeChange(_: Event) {
        const type = this.getType();
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
                debug(type, (this.alert.entity as any)[this.propertyName!], typeValue)
            }
            else {
                typeValue = "json"
            }

            if (typeValue) {
                this.propertyTypeField.value = typeValue;
            }

            if (prop && !this.getValue()) {
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

    private onPropertyNameTextChanged(ev: InputEvent) {
        this.setPropertyNameInternal(this.propertyName = (ev.currentTarget as HTMLTextAreaElement | HTMLInputElement).value.trim());
    }

    getType(): "string" | "boolean" | "number" | "json" {
        return this.propertyTypeField.value as any;
    }

    hasDiffs(prop: any): boolean {
        if (!this.propertyName) return false;

        if (this.getType() != "json") {
            return prop != (this.alert.entity as any)[this.propertyName]
        }
        else {
            for (const k in prop) {
                if ((this.alert.entity as any)[k] != prop[k]) {
                    return true;
                }
            }
            return false;
        }
    }

    valueToProperty() {
        const value = this.getValue()
        switch (this.getType()) {
            case "number":
                return Number(value);
            case "boolean":
                return Boolean(value);
            case "json": 
                switch (value) {
                    case "undefined":
                        return undefined 
                    case "null":
                        return null;
                    default:
                        return JSON.parse(value)
                }
            default:
                return String(this.getValue())
            }
        }
    }


export function AddSpoofAlertFieldButton({ ...props }) {
    return <button {...props} class={`EditContentModal_input__8O8GH EditContentModal_field__rexIL ${styles.AddSpoofAlertFieldField}`}>Добавить поле</button>
}