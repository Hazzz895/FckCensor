import { sources } from "@/api/main-api";
import { JSX } from "@/jsx-runtime";
import { Artist, Album, Track, Release, SpoofableEntity, SpoofableType, FckCensorSpoofData } from "@/types";
import { AlertButtons, ActionButton, createScrimAlert, closeAlert } from "@/ui/components/alerts/alerts";
import { httpsify, isEmptyObject, localizeSpoofableType, cloneEntity } from "@/utils/common";
import { debug, error, log } from "@/utils/logger";
import { Cover } from "../../../Cover";
import SpoofAlertCustomPropertyField, { AddSpoofAlertFieldButton } from "./SpoofAlertCustomPropertyField";
import { SpoofAlertEntityPropertyField } from "./SpoofAlertEntityPropertyField";
import { SpoofAlertInputField } from "./SpoofAlertInputField";
import styles from "@/styles.module.scss"
import { spoofEntity } from "@/utils/spoofs";
import { restoreAllNodesByType, showNotificationWithCover, spoofAllNodesFor } from "@/utils/ui-utils";
import { CoverProps } from "../spoof-alert";
import { SpoofAlertCoverField } from "./SpoofAlertCoverField";
import { localSource } from "@/api/db-api";
import { report } from "@/api/reports-api";
import { ReportCensorActionButton } from "./ReportCensorActionButton";
import { Badge, updateBadgesByType } from "@/hooks/ui/badges";
import { ADDON_FAQ_URI } from "@/hooks/ui/constants";
import { isLiteMode } from "@/utils/pulsesync";
import { LITE_MODE_WARNING, shouldShowTutorial, TutorialTooltip } from "@/hooks/ui/tutorial";

export type SpoofRemoveAction = "remove" | "cancel" | "restore";

export abstract class SpoofAlertBase<T extends SpoofableEntity = SpoofableEntity> {
    get artist() {
        if (this.type != "artist") throw new Error("Tried to get artist from non-artist alert");
        return this.entity as Artist
    }

    get release() {
        if (["album", "track"].indexOf(this.type) == -1) throw new Error("Tried to get release from non-release alert");
        return this.entity as Release
    }

    get album() {
        if (this.type != "album") throw new Error("Tried to get album from non-album alert");
        return this.entity as Album
    }

    get track(): Track {
        if (this.type != "track") throw new Error("Tried to get track from non-track alert");
        return this.entity as Track;
    }

    readonly spoofAlert;
    readonly entity: T;
    protected readonly realEntity: T;
    readonly type;
    readonly id;
    readonly title;

    readonly sourceNode;
    protected readonly scrim;
    private fields: SpoofAlertEntityPropertyField[] = [];
    protected readonly hadSpoof;
    protected readonly removeAction: SpoofRemoveAction | null;

    addPropertyField(field: SpoofAlertEntityPropertyField) {
        this.fields.push(field);
        return field.element
    }

    removePropertyField(field: SpoofAlertEntityPropertyField) {
        this.fields = this.fields.filter(x => x !== field);
    }

    protected constructor(entity: T, type: SpoofableType, alertTitle: string, sourceNode?: HTMLElement, scrim?: HTMLElement) {
        this.realEntity = entity;
        entity = cloneEntity(entity);
        if (isLiteMode()) {
            spoofEntity(type, entity);
        }
        this.entity = entity;
        this.scrim = scrim;
        this.sourceNode = sourceNode;
        this.type = type;
        this.title = alertTitle;

        const title = type === "artist" ? this.artist.name : this.release.title;
        let coverUri = entity.coverUri || entity.ogImage;
        if (coverUri) {
            coverUri = httpsify(coverUri);
        }
        this.id = String(entity.id);

        this.hadSpoof =(this.type == "artist" && (sources.hasInsertions(this.id) || sources.hasArtistSpoof(this.id))) ||
                        (this.type == "album" && sources.hasAlbumSpoof(this.id)) ||
                        (this.type == "track" && sources.hasTrackSpoof(this.id));

        this.removeAction = this.getSpoofRemoveAction();

        const addPropButton = <AddSpoofAlertFieldButton onclick={(ev: MouseEvent) => onAddPropButtonClick(this, ev)}>Добавить поле</AddSpoofAlertFieldButton>

        function onAddPropButtonClick(ts: SpoofAlertBase, ev: MouseEvent) {
            addPropButton.parentElement!.insertBefore(ts.addPropertyField(new SpoofAlertCustomPropertyField(ts)), addPropButton)
        }

        const titleField = this.addPropertyField(new SpoofAlertInputField(this, type === "artist" ? "name" : "title", type === "artist" ? "Имя исполнителя" : "Название"));
        const coverField = this.addPropertyField(new SpoofAlertCoverField(this));
        const childrenNode = this.getChildren();

        const prevSpoof = this.getPrevSpoofedData();
        let customFields = null
        if (prevSpoof) {
            customFields = []
            for (const k of Object.keys(prevSpoof).filter(k => ["id", "ogImage", "available", "error"].indexOf(k) === -1 && !this.fields.some(f => f.propertyName == k))) {
                const field = new SpoofAlertCustomPropertyField(this);
                const fieldElement = field.element;
                field.setSavedValue(k, (prevSpoof as any)[k]);
                this.addPropertyField(field);
                customFields.push(fieldElement);
            }
        }

        let jsonStructure = JSON.stringify((this.realEntity as any)?.toJSON?.() || this.entity, null, 4).replace('\\n', '\n');

        let liteModeTooltip = null;
        if (isLiteMode() && shouldShowTutorial(LITE_MODE_WARNING)) {
            liteModeTooltip = <TutorialTooltip id={LITE_MODE_WARNING} class="QhR4J536RmNHBB5bZYwF EditContentModal_field__rexIL">Включен упрощённый режим. Изменения{this.type === "track" ? " (кроме аудиопотока) " : ""} не будут применены на {localizeSpoofableType(this.type)} до отключения.{this.type === "track" ? " Подмена аудиопотока будет применена." : ""}</TutorialTooltip>
        }

        const content = (<div>
            {liteModeTooltip}
            <div class={"EditContentModal_field__rexIL " + styles.CoverAndTitleContainer}>
                {coverField}
                {titleField}
            </div>
            {childrenNode}
            <details class="EditContentModal_field__rexIL">
                <summary class="EditContentModal_field__rexIL">
                    <div style="display: inline-flex">
                        Дополнительные поля (продвинуто)
                        <a target="_blank" rel="noreferrer noopener" class="buOTZq_TKQOVyjMLrXvB Meta_root_withSecondaryColor___uENY" href={ADDON_FAQ_URI + "#%D0%B4%D0%BE%D0%BF%D0%BE%D0%BB%D0%BD%D0%B8%D1%82%D0%B5%D0%BB%D1%8C%D0%BD%D1%8B%D0%B5-%D0%BF%D0%BE%D0%BB%D1%8F-%D0%BF%D0%BE%D0%B4%D0%BC%D0%B5%D0%BD%D1%8B-%D0%BF%D1%80%D0%BE%D0%B4%D0%B2%D0%B8%D0%BD%D1%83%D1%82%D0%BE"}>
                            <Badge icon="info_xxs" description="Нажмите, чтобы узнать как работать с дополнительными полями"/>
                        </a>
                    </div>
                </summary>
                {jsonStructure && <details>
                    <summary class="EditContentModal_field__rexIL">JSON-структура</summary>
                    <pre style="color: var(--ym-controls-color-secondary-text-enabled_variant)" class={"EditContentModal_input__8O8GH " + styles.i}>{jsonStructure}</pre>
                </details>}
                {customFields}
                {addPropButton}
            </details>
            <div style="display: flex; justify-content: space-between">
                <div style="display: flex; gap: 8px">
                    {this.getAdditionalButtons()}
                </div>
                <div style="display: flex; gap: 8px">
                    <ActionButton onclick={this.onSpoofRemoveInternal.bind(this)} {...(!this.removeAction ? { disabled: true } : {})}>{this.removeAction === "restore" ? "Вернуть подмену" : "Удалить подмену"}</ActionButton>
                    <ActionButton onclick={this.onApplyInternal.bind(this)}>Применить</ActionButton>
                </div>
            </div>
        </div>)

        this.spoofAlert = createScrimAlert(scrim as JSX.Element, alertTitle, content);
    }

    getOriginalValue(propertyName: string) {
        const originalValues = sources.getFckCensorData(this.type, this.id)?.originalValues ?? this.entity.__fckCensor?.originalValues;
        return originalValues && propertyName in originalValues ? originalValues[propertyName] : (this.entity as any)[propertyName];
    }

    protected getAdditionalButtons(): JSX.Child { return new ReportCensorActionButton({ id: this.id, type: this.type }).element }

    protected async onApplyInternal() {
        closeAlert(this.spoofAlert);

        const spoofData = this.getSpoofData();
        const prevSpoof = this.getPrevSpoofedData();
        log("Applying spoof to", this.type, spoofData)
        if (spoofData || this.forceSpoof()) {
            await this.onApply(spoofData && cloneEntity(spoofData));
            updateBadgesByType(this.type, this.id);
        }
        else if (this.hadSpoof) {
            await this.onSpoofRemoveInternal();
            return;
        }
        
        try {
            await this.afterSpoofChanged();
        } catch (e) { error(e) }

        const l = localizeSpoofableType(this.type);
        showNotificationWithCover(this.entity, `${l[0].toUpperCase() + l.slice(1)} подменен успешно! Для применения изменений может потребоваться перезаход.`, "info")

        if (!prevSpoof) {
            await report(this.id, this.type, true);
        }
    }

    private getSpoofRemoveAction(): SpoofRemoveAction | null {
        switch (localSource.getSpoofState(this.type, this.id)) {
            case "own": return "remove";
            case "exception": return "restore";
            default: return sources.hasAutomaticSpoof(this.type, this.id) ? "cancel" : null;
        }
    }

    private async onSpoofRemoveInternal() {
        if (!this.removeAction) return;

        closeAlert(this.spoofAlert);
        try {
            restoreAllNodesByType(this.type, this.id);
        } catch (e) { error(e) }
        sources.forgetFckCensorData(this.type, this.id);

        switch (this.removeAction) {
            case "remove": await this.onSpoofRemove(); break;
            case "cancel": await this.onSpoofCancel(); break;
            case "restore": await this.onSpoofRestore(); break;
        }

        try {
            spoofAllNodesFor(this.type, this.id);
        } catch (e) { error(e) }

        updateBadgesByType(this.type, this.id);

        try {
            await this.afterSpoofChanged();
        } catch (e) { error(e) }

        showNotificationWithCover(this.entity, `Подмена была ${this.removeAction === "restore" ? "восстановлена" : "отменена"}! Для применения изменений может потребоваться перезаход.`, "info");
    }

    protected async onSpoofCancel(): Promise<void> {
        await localSource.pushSpoof({}, this.id, this.type);
    }

    protected async onSpoofRestore(): Promise<void> {
        await this.onSpoofRemove();
    }

    protected forceSpoof() {
        return false;
    }

    protected async afterSpoofChanged(): Promise<void> {}

    private getSpoofData(): T | null {
        let changedData: Partial<T> = {};
        for (const field of this.fields) {
            if (!field.propertyName) continue;
            const prop = field.getValue();
            if (field.hasDiffs(prop)) {
                (changedData as any)[field.propertyName] = prop;
            }
        }

        if (this.forceSpoof() || !isEmptyObject(changedData)) {
            if (isEmptyObject(changedData)) {
                return null;
            }
            else {
                return changedData as T;
            }
        }
        else {
            log("Spoof has not any changes! Not applying")
        }
        return null;
    }

    protected abstract onApply(spoofData: object | null): Promise<void>;

    protected abstract onSpoofRemove(): Promise<void>;

    protected abstract getChildren(): JSX.Child;

    protected abstract getPrevSpoofedData(): object | null;
}