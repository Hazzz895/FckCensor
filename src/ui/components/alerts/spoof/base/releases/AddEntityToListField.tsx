import { Release } from "@/types";
import { Searchable } from "@/ui/components/Searchable";
import { AddSpoofAlertFieldButton } from "../SpoofAlertCustomPropertyField";
import { TextField } from "../../../alerts";
import { localizeSpoofableType } from "@/utils/common";
import styles from "@/styles.module.scss";

export class AddEntityToListField<T extends Release> extends Searchable<T> {
    private searching = false;

    protected createElement(): HTMLElement {
        if (!this.searching) {
            return <AddSpoofAlertFieldButton onclick={this.onReleaseAddClick.bind(this)}>{`Добавить ${localizeSpoofableType(this.type)}`}</AddSpoofAlertFieldButton>
        }
        else {
            const field = <TextField onfocusout={this.onFocusLost.bind(this)} header={`Поиск по тексту / Ссылка на ${localizeSpoofableType(this.type)}`} placeholder="Поиск..."/>;
            field.querySelector("input")?.replaceWith(super.createElement());
            this.input?.classList.add("EditContentModal_input__8O8GH", styles.i);
            return field;
        }
    }

    protected onFocusLost(ev: FocusEvent) {
        this.searching = false;
        super.onFocusLost(ev);
        this.reRenderElement();
    }

    protected onReleaseAddClick(ev: MouseEvent) {
        this.searching = true;
        this.reRenderElement();
        this.focusMaybe();
    }
}