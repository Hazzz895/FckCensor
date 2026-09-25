import { ActionButton } from "@/ui/components/alerts/alerts";
import ElementWrap from "@/ui/components/ElementWrap";
import { log, error, debug } from "@/utils/logger";
import { SpoofTrackAlert } from "./SpoofTrackAlert";
import styles from "@/styles.module.scss";
import { sources } from "@/api/main-api";
import { ReplacedBadge } from "@/hooks/ui/badges";
import { SpoofAlertEntityPropertyField } from "../base/SpoofAlertEntityPropertyField";
import { getAudioMetadata, reloadPlayer } from "@/utils/music";
import { localSource } from "@/api/db-api";

export class SpoofAudioField extends SpoofAlertEntityPropertyField<number | undefined> {
    private _file?: File;
    private displayValue?: boolean
    private durationMs?: number;

    public get file() {
        return this._file;
    }

    private set file(value) {
        this.displayValue = this._file !== value ? !!value : this.displayValue;
        this._file = value;
    }

    public get hasChanges() {
        return this.displayValue !== undefined;
    }

    constructor(alert: SpoofTrackAlert) {
        super(alert, "durationMs", alert.entity.durationMs);
    }

    protected createElement(): HTMLElement {
        const hasSpoof = !!(this.displayValue !== undefined ? this.displayValue : sources.hasPlayerReplacement(this.alert.id));
        return <div class={"EditContentModal_field__rexIL " + styles.i} style="display: grid; align-items: center; grid-template-columns: 1fr 1fr; gap: 24px">
                <ActionButton onclick={this.onReplaceButtonClick.bind(this)} style="width: 100%">{hasSpoof ? "Удалить подмену аудио" : "Подменить аудио"}</ActionButton>
                <div style="text-align: center">
                    <span>{hasSpoof ? "Аудио подменено" : "Аудио не подменивается."}</span>
                </div>
        </div>
    }

    private async onReplaceButtonClick(ev: MouseEvent) {
        if (this._file) {
            this.file = undefined;
            this.reRenderElement();
        }
        else if (this.hasChanges) {
            this.displayValue = undefined;
            this.reRenderElement();
        }
        else if (sources.hasPlayerReplacement(this.alert.id)) {
            this.displayValue = false;
            this.reRenderElement();
        }
        else if (!this.hasChanges && localSource.hasPlayerReplacementException(this.alert.id)) {
            this.displayValue = true;
            this.reRenderElement();
        }
        else {
            this.openFilePicker();
        }
    }

    public async onApply() {
        if (this.displayValue === undefined) return;

        if (this.file) {
            await localSource.pushTrackReplacement(this.alert.id, this.file);
        }
        else if (!this.displayValue) {
            if (localSource.hasPlayerReplacement(this.alert.id) === true) {
                await localSource.removeTrackReplacement(this.alert.id);
            }
            else if (sources.hasPlayerReplacement(this.alert.id)) {
                await localSource.pushTrackReplacementException(this.alert.id);
            }
        }
        else if (localSource.hasPlayerReplacementException(this.alert.id)) {
            await localSource.removeTrackReplacement(this.alert.id);
        }
        reloadPlayer(this.alert.id);
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

    getValue() {
        return this._file && this.durationMs ? this.durationMs : this.originalValue;
    }

    hasDiffs(prop: any): boolean {
        return !!this._file && this.displayValue !== undefined;
    }
}