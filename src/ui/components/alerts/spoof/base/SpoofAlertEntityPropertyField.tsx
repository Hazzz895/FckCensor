import ElementWrap from "@/ui/components/ElementWrap";
import { SpoofAlertBase } from "./SpoofAlertBase";
import { IGetValue } from "@/ui/components/IGetValue";


export abstract class SpoofAlertEntityPropertyField<T = any> extends ElementWrap implements IGetValue<T> {
    protected readonly alert;
    propertyName;
    protected readonly originalValue;

    public constructor(alert: SpoofAlertBase, propertyName?: string, value?: T) {
        super();
        this.alert = alert;
        this.propertyName = propertyName;
        this.originalValue = value;
    }

    abstract getValue(): T;

    hasDiffs(prop: T): boolean {
        return JSON.stringify(prop) != JSON.stringify(this.originalValue);
    }
}
