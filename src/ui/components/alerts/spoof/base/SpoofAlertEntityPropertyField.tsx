import ElementWrap from "@/ui/components/ElementWrap";
import { SpoofAlertBase } from "./SpoofAlertBase";


export abstract class SpoofAlertEntityPropertyField<T extends HTMLElement = HTMLElement> extends ElementWrap<T> {
    protected readonly alert;
    propertyName;
    protected readonly originalValue;

    public constructor(alert: SpoofAlertBase, propertyName?: string, value?: any) {
        super();
        this.alert = alert;
        this.propertyName = propertyName;
        this.originalValue = value;
    }

    abstract valueToProperty(): any;

    abstract hasDiffs(prop: any): boolean;
}
