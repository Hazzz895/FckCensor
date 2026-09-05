import { SpoofableEntity } from "@/types";
import { SpoofAlertArtistsField } from "./SpoofAlertArtistsField";
import { SpoofAlertBase } from "../SpoofAlertBase";

export abstract class SpoofEntityWithArtistsAlert<T extends SpoofableEntity> extends SpoofAlertBase<T> {
    protected getChildren(): HTMLElement {
        return this.addPropertyField(new SpoofAlertArtistsField(this));
    }
}