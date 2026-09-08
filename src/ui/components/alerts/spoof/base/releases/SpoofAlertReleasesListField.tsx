import ElementWrap from "@/ui/components/ElementWrap";
import { SpoofAlertBase } from "../SpoofAlertBase";
import { SpoofAlertEntityPropertyField } from "../SpoofAlertEntityPropertyField";
import { Release } from "@/types";
import { ActionButton, TextField } from "../../../alerts";
import styles from "@/styles.module.scss";
import { ReleaseNode } from "./ReleaseNode";
import { debug } from "@/utils/logger";
import { IGetValue } from "@/ui/components/IGetValue";
import { localizeSpoofableType } from "@/utils/common";
import { getTracks } from "@/utils/music";
import { AddSpoofAlertFieldButton } from "../SpoofAlertCustomPropertyField";

export abstract class SpoofAlertReleasesListField extends SpoofAlertEntityPropertyField {
    public constructor(alert: SpoofAlertBase, private readonly title: string, protected readonly type: "track" | "album", originalValue?: any) {
        super(alert, alert.type == "album" && type == "track" ? "volumes" : undefined, originalValue);
    }

    public hasDiffs(prop: any) {
        debug("diff", prop, this.originalValue);
        return super.hasDiffs(prop);
    }

    get hasChanges() {
        return this.hasDiffs(this.valueToProperty());
    }

    protected releaseNodes: (ElementWrap & IGetValue<any>)[] = [];

    protected createElement() {
        this.releaseNodes = []
        return <TextField Tag="div" style="display: flex; gap: 8px; flex-direction: column" header={this.title} class={styles.i + " " + " EditContentModal_input__8O8GH EditContentModal_field__rexIL"}>
            {this.fillElements().map(n => {
                this.releaseNodes.push(n);
                return n.element;
            })}
            <div class={styles.FullWidthContainer}>
                <AddSpoofAlertFieldButton onclick={this.onReleaseAddClick.bind(this)}>{`Добавить ${localizeSpoofableType(this.type)}`}</AddSpoofAlertFieldButton>
                {this.getAdditionalActionButton()}
            </div>
        </TextField>
    }

    protected onReleaseAddClick(ev: MouseEvent) {
        const button = (ev.currentTarget as HTMLButtonElement);
        const field = <TextField onfocusout={this.onFocusLost.bind(this)} oninput={this.onTextFieldTextChanged.bind(this)} header={`Поиск по тексту / Ссылка на ${localizeSpoofableType(this.type)}`} placeholder="Поиск..."/>;
        button.parentElement?.replaceWith(field);
        field.querySelector("input")!.focus();
    }

    private onTextFieldTextChanged(ev: InputEvent) {
        const text = (ev.currentTarget as HTMLInputElement).value;
        debug(text)
        if (this.type == "track") {
            const trackUrlRegex = /.*track\/(\d+)/
            if (trackUrlRegex.test(text)) {
                const trackId = trackUrlRegex.exec(text)![1];
                if (trackId) {
                    getTracks(trackId).then(tracks => {
                        this.onReleaseAddInternal(tracks[0]);
                    })
                }
            }
        }
    }

    private onFocusLost(ev: FocusEvent) {
        this.reRenderElement();
    }

    private onReleaseAddInternal(release: Release) {
        this.onReleaseAdd(release);
        this.reRenderElement();
    }

    protected abstract onReleaseAdd(release: Release): void;

    protected getAdditionalActionButton(): HTMLElement | undefined {
        return undefined;
    }

    protected abstract fillElements(): (ElementWrap & IGetValue<any>)[];
}