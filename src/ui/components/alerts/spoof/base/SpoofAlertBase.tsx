import { sources } from "@/api/main-api";
import { JSX } from "@/jsx-runtime";
import { Artist, Album, Track, Release, SpoofableEntity, SpoofableType } from "@/types";
import { AlertButtons, ActionButton, createScrimAlert, closeAlert } from "@/ui/components/alerts/alerts";
import { httpsify, isEmptyObject } from "@/utils/common";
import { log } from "@/utils/logger";
import { Cover } from "../../../Cover";
import SpoofAlertCustomPropertyField, { AddSpoofAlertFieldButton } from "./SpoofAlertCustomPropertyField";
import { SpoofAlertEntityPropertyField } from "./SpoofAlertEntityPropertyField";
import { SpoofAlertInputField } from "./SpoofAlertInputField";
import styles from "@/styles.module.scss"

export abstract class SpoofAlertBase<T extends SpoofableEntity = SpoofableEntity> {
    get artist() {
        return this.entity as Artist
    }

    get release() {
        return this.entity as Release
    }

    readonly spoofAlert;
    readonly coverNode?;
    readonly entity;
    readonly type;
    readonly id;
    readonly title;

    readonly sourceNode;
    protected readonly scrim;
    private fields: SpoofAlertEntityPropertyField[] = [];
    protected readonly hadSpoof;

    addPropertyField(field: SpoofAlertEntityPropertyField) {
        this.fields.push(field);
        return field.element
    }

    removePropertyField(field: SpoofAlertEntityPropertyField) {
        this.fields = this.fields.filter(x => x !== field);
    }

    protected constructor(entity: T, type: SpoofableType, alertTitle: string, sourceNode?: HTMLElement, scrim?: HTMLElement) {
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

        const coverNode = coverUri ? <Cover src={coverUri}></Cover> : undefined

        this.hadSpoof =(this.type == "artist" && sources.hasArtistSpoof(this.id)) ||
                        (this.type == "album" && sources.hasAlbumSpoof(this.id)) ||
                        (this.type == "track" && sources.hasTrackSpoof(this.id));

        const addPropButton = <AddSpoofAlertFieldButton onclick={(ev: MouseEvent) => onAddPropButtonClick(this, ev)}/>

        function onAddPropButtonClick(ts: SpoofAlertBase, ev: MouseEvent) {
            spoofAlert.insertBefore(ts.addPropertyField(new SpoofAlertCustomPropertyField(ts)), addPropButton)
        }

        const titleField = this.addPropertyField(new SpoofAlertInputField(this, type === "artist" ? "name" : "title", type === "artist" ? "Имя исполнителя" : "Название", title));
        const childrenNode = this.getChildren();

        const prevSpoof = this.getPrevSpoofedData();
        let customFields = null
        if (prevSpoof) {
            customFields = []
            for (const k of Object.keys(prevSpoof).filter(k => !(k == "id" || this.fields.some(f => f.propertyName == k)))) {
                const field = new SpoofAlertCustomPropertyField(this);
                const fieldElement = field.element;
                field.setSavedValue(k, (prevSpoof as any)[k]);
                this.addPropertyField(field);
                customFields.push(fieldElement);
            }
        }

        const spoofAlert = (<div>
            <div class={"EditContentModal_field__rexIL " + styles.CoverAndTitleContainer}>
                {coverNode}
                {titleField}
            </div>
            {childrenNode}
            {customFields}
            {addPropButton}
            <AlertButtons>
                <ActionButton onclick={this.onSpoofRemoveInternal.bind(this)} {...(!this.hadSpoof ? { disabled: true } : {})}>Удалить подмену</ActionButton>
                <ActionButton onclick={this.onApplyInternal.bind(this)}>Применить</ActionButton>
            </AlertButtons>
        </div>)

        this.spoofAlert = createScrimAlert(scrim as JSX.Element, alertTitle, spoofAlert);
        this.coverNode = coverNode;
    }

    protected onApplyInternal() {
        closeAlert(this.spoofAlert);

        const spoofData = this.getSpoofData();
        if (spoofData) {
            this.onApply(JSON.parse(JSON.stringify(spoofData)));
        }
        else if (this.hadSpoof) {
            this.onSpoofRemove();
        }
    }

    private onSpoofRemoveInternal() {
        closeAlert(this.spoofAlert);
        this.onSpoofRemove();
    }

    protected forceSpoof() {
        return false;
    }

    private getSpoofData(): object | null {
        const spoofData: Record<string, any> = {};
        for (const field of this.fields) {
            if (!field.propertyName) continue;
            const prop = field.valueToProperty();
            if (field.hasDiffs(prop)) {
                spoofData[field.propertyName] = prop;
            }
        }

        if (this.forceSpoof() || !isEmptyObject(spoofData)) {
            log("Applying spoof to", this.type, spoofData)
            return spoofData;
        }
        else {
            log("Spoof has not any changes! Not applying")
        }
        return null;
    }

    protected abstract onApply(spoofData: object): Promise<void>;

    protected abstract onSpoofRemove(): Promise<void>;

    protected abstract getChildren(): HTMLElement;

    protected abstract getPrevSpoofedData(): object | null;
}