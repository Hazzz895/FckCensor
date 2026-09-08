import { Release } from "@/types";
import { Searchable } from "@/ui/components/Searchable";
import { AddSpoofAlertFieldButton } from "../SpoofAlertCustomPropertyField";
import { TextField } from "../../../alerts";
import { localizeSpoofableType } from "@/utils/common";

export class AddEntityToListField<T extends Release> extends Searchable<T> {
    private searching = false;

    protected createElement(): HTMLElement {
        if (!this.searching) {
            return <AddSpoofAlertFieldButton onclick={this.onReleaseAddClick.bind(this)}>{`Добавить ${localizeSpoofableType(this.type)}`}</AddSpoofAlertFieldButton>
        }
        else {
            const field = <TextField onfocusout={this.onFocusLost.bind(this)} header={`Поиск по тексту / Ссылка на ${localizeSpoofableType(this.type)}`} placeholder="Поиск..."/>;
            field.querySelector("input")?.replaceWith(super.createElement());
            return field;
        }
    }

    protected onReleaseAddClick(ev: MouseEvent) {
        this.searching = true;
        this.reRenderElement();
    }
}