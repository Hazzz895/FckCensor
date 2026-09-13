import { SpoofableEntity } from "@/types";
import { SpoofAlertArtistsField } from "./SpoofAlertArtistsField";
import { SpoofAlertBase } from "../SpoofAlertBase";
import { JSX } from "@/jsx-runtime";
import { SwitchField } from "@/ui/components/SwitchField";

export abstract class SpoofEntityWithArtistsAlert<T extends SpoofableEntity> extends SpoofAlertBase<T> {
    declare protected artistsField: SpoofAlertArtistsField;

    protected getChildren(): JSX.Child {
        return [
            this.addPropertyField(this.artistsField = new SpoofAlertArtistsField(this)),
        ];
    }
}