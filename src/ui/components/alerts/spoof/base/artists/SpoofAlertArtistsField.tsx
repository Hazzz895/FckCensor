import styles from "@/styles.module.scss";
import { Artist } from "@/types";
import { CloseButton, TextField } from "@/ui/components/alerts/alerts";
import { debug } from "@/utils/logger";
import { SpoofAlertBase } from "../SpoofAlertBase";
import { SpoofAlertEntityPropertyField } from "../SpoofAlertEntityPropertyField";
import { TabbedArtist } from "./TabbedArtist";
import { JSX } from "@/jsx-runtime";

export function AddButton({ ...props }: JSX.HTMLAttributes) {
    const addButton = <CloseButton {...props}/>
    addButton.querySelector("svg > use")!.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '/icons/sprite.svg#add_xxs')
    addButton.classList.remove("YUY9QjXr1E4DQfQdMjGt")
    return addButton;
}

export class SpoofAlertArtistsField extends SpoofAlertEntityPropertyField {
    public constructor(alert: SpoofAlertBase) {
        super(alert, "artists", alert.release.artists)
        this.artists = alert.release.artists!;
    }

    private artistNodes: TabbedArtist[] = [];
    private artists;

    valueToProperty() {
        return this.artistNodes
                .map(x => x.getArtist())
                .filter(x => !!x);
    }

    createElement(): HTMLElement {
        this._element = <TextField Tag="div" style="display: flex; gap: 8px; flex-wrap: wrap" header="Исполнители" class={styles.i + " " + " EditContentModal_input__8O8GH EditContentModal_field__rexIL"}></TextField>
        this.renderArtists();
        return this._element;
    }

    hasDiffs(prop: any): boolean {
        debug(prop, this.originalValue)
        if (prop.length != this.originalValue.length) return true;

        const set = new Set(this.originalValue.map((item: Artist) => this.artistIdentity(item)));
        return !prop.every((item: Artist) => set.has(this.artistIdentity(item)));
    }

    private artistIdentity(artist: Artist) {
        return artist.id != null ? `id:${artist.id}` : `name:${artist.name ?? ""}`;
    }
    
    renderArtists() {
        const container = this.element.querySelector('.EditContentModal_field__rexIL > .EditContentModal_input__8O8GH')!
        container.innerHTML = ''
        this.artistNodes = [];

        for (const a of this.artists) {
            const artistNode = new TabbedArtist(a);
            this.artistNodes.push(artistNode);
            container.appendChild(artistNode.element)
        }

        const addButton = <AddButton onclick={this.onAdd.bind(this)}/>
        container.appendChild(addButton)
    }

    private onAdd(ev: MouseEvent) {
        const $new = new TabbedArtist();
        this.artistNodes.push($new);
        const p = (ev.currentTarget as HTMLElement).parentElement;
        p?.insertBefore($new.element, p.lastElementChild)
        $new.focusMaybe();
    }
}