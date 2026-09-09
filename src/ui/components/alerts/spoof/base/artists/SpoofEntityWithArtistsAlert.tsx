import { SpoofableEntity } from "@/types";
import { SpoofAlertArtistsField } from "./SpoofAlertArtistsField";
import { SpoofAlertBase } from "../SpoofAlertBase";

export abstract class SpoofEntityWithArtistsAlert<T extends SpoofableEntity> extends SpoofAlertBase<T> {
    declare protected artistsField: SpoofAlertArtistsField;

    protected getChildren(): HTMLElement {
        return this.addPropertyField(this.artistsField = new SpoofAlertArtistsField(this));
    }
}