import { ActionButton } from "@/ui/components/alerts/alerts";
import ElementWrap from "@/ui/components/ElementWrap";
import { log, error, debug } from "@/utils/logger";
import { SpoofTrackAlert } from "./SpoofTrackAlert";
import styles from "@/styles.module.scss";
import { sources } from "@/api/main-api";
import { ReplacedBadge } from "@/hooks/ui/badges";
import { SpoofAlertEntityPropertyField } from "../base/SpoofAlertEntityPropertyField";
import { getAudioMetadata } from "@/utils/music";

export class SpoofAudioField extends SpoofAlertEntityPropertyField {
    private _file?: File;
    private _hasChanges: boolean = false;
    private durationMs?: number;

    public get file() {
        return this._file;
    }

    private set file(value) {
        this._hasChanges = true;
        this._file = value;
    }

    public get hasChanges() {
        return this._hasChanges;
    }

    constructor(alert: SpoofTrackAlert) {
        super(alert, "durationMs", alert.entity.durationMs);
    }

    protected createElement(): HTMLElement {
        return <div class={"EditContentModal_field__rexIL " + styles.i} style="display: grid; align-items: center; grid-template-columns: 1fr 1fr; gap: 24px">
                <ActionButton onclick={this.onReplaceButtonClick.bind(this)} style="width: 100%">{this._file ? "Удалить подмену аудио" : "Подменить аудио"}</ActionButton>
                <div style="text-align: center">
                    <span>{!!((this.hasChanges && this._file) || sources.hasPlayerReplacement(this.alert.id)) ? "Аудио подменено" : "Аудио не подменивается."}</span>
                </div>
        </div>
    }

    private onReplaceButtonClick(ev: MouseEvent) {
        if (this._file) {
            this._file = undefined;
            this.reRenderElement();
        }
        else {
            this.openFilePicker();
        }
    }

    private openFilePicker() {
        window.showOpenFilePicker({
            types: [
                {
                    description: "Аудио-файлы",
                    accept: { "audio/*": [".mp3", ".wav", ".ogg", ".flac"] },
                },
            ],
            multiple: false,
        })
        .then(async (fileHandles) => {
            const fileHandle = fileHandles[0];
            const file = await fileHandle.getFile();
            if (!file.type.startsWith("audio/")) {
                return;
            }

            this.file = file;
            this.reRenderElement();
            this.durationMs = (await getAudioMetadata(file)).duration * 1000;
            log("Added track " + this.alert.entity.id + " to local tracks");
        })
        .catch((e) => error(e));
    }

    valueToProperty(): number | undefined {
        return this._file && this.durationMs ? this.durationMs : this.originalValue;
    }

    hasDiffs(prop: any): boolean {
        return !!this._file && this.hasChanges;
    }
}