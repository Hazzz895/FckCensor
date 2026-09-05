import ElementWrap from "@/ui/components/ElementWrap";
import { SpoofAlertBase } from "../SpoofAlertBase";
import { SpoofAlertEntityPropertyField } from "../SpoofAlertEntityPropertyField";
import { Release } from "@/types";
import { TextField } from "../../../alerts";
import styles from "@/styles.module.scss";
import { ReleaseNode } from "./ReleaseNode";
import { debug } from "@/utils/logger";

export abstract class SpoofAlertReleasesListField<T extends ElementWrap> extends ElementWrap {
    public readonly alert;
    private readonly type;

    public constructor(alert: SpoofAlertBase, type: "track" | "album") {
        super();
        this.alert = alert;
        this.type = type;
    }

    protected releaseNodes: T[] = [];

    protected createElement() {
        this.releaseNodes = []
        return <TextField Tag="div" style="display: flex; gap: 8px; flex-direction: column" header={this.type == "track" ? "Треки" : "Альбомы"} class={styles.i + " " + " EditContentModal_input__8O8GH EditContentModal_field__rexIL"}>
            {this.fillElements().map(n => {
                this.releaseNodes.push(n);
                return n.element;
            })}
        </TextField>
    }

    protected abstract fillElements(): T[];
}