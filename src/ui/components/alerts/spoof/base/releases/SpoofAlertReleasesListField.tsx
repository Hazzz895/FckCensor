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
import { AddEntityToListField } from "./AddEntityToListField";

export abstract class SpoofAlertReleasesListField<T> extends SpoofAlertEntityPropertyField<T[]> {
    public constructor(alert: SpoofAlertBase, private readonly title: string, protected readonly type: "track" | "album", originalValue?: any) {
        super(alert, alert.type == "album" && type == "track" ? "volumes" : undefined, originalValue);
    }

    public hasDiffs(prop: T[]) {
        debug("diff", prop, this.originalValue);
        return super.hasDiffs(prop);
    }

    get hasChanges() {
        return this.hasDiffs(this.getValue());
    }

    protected releaseNodes: (ElementWrap & IGetValue<T>)[] = [];

    protected createElement() {
        this.releaseNodes = []
        return <TextField Tag="div" style="display: flex; gap: 8px; flex-direction: column" header={this.title} class={styles.i + " " + " EditContentModal_input__8O8GH EditContentModal_field__rexIL"}>
            {this.fillElements().map(n => {
                this.releaseNodes.push(n);
                return n.element;
            })}
            <div class={styles.FullWidthContainer}>
                {new AddEntityToListField<Release>(this.type, this.onReleaseAddInternal.bind(this)).element}
                {this.getAdditionalActionButton()}
            </div>
        </TextField>
    }

    private onReleaseAddInternal(release: Release) {
        this.onReleaseAdd(release);
        this.reRenderElement();
    }

    protected abstract onReleaseAdd(release: Release): void;

    protected getAdditionalActionButton(): HTMLElement | undefined {
        return undefined;
    }

    protected abstract fillElements(): (ElementWrap & IGetValue<T>)[];
}