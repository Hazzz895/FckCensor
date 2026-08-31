import { TextField } from "@/ui/components/alerts/alerts";
import { SpoofAlertBase } from "./SpoofAlertBase";
import { SpoofAlertEntityPropertyField } from "./SpoofAlertEntityPropertyField";


export class SpoofAlertInputField extends SpoofAlertEntityPropertyField {
    readonly label;

    public constructor(alert: SpoofAlertBase, propertyName: string, label?: string, value?: string) {
        super(alert, propertyName, value);
        this.label = label;
    }

    valueToProperty() {
        return this.element.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea')?.value ?? this.originalValue ?? "";
    }

    hasDiffs(prop: string) {
        return prop != this.originalValue;
    }

    createElement(): HTMLElement {
        return <TextField header={this.label} placeholder={this.originalValue} value={this.originalValue} />;
    }
}
