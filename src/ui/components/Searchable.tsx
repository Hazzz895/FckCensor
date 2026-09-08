import { Artist, Release, SpoofableEntity, SpoofableType } from "@/types";
import ElementWrap from "./ElementWrap";
import styles from "@/styles.module.scss";
import { getArtist, search } from "@/utils/music";
import { Cover } from "./Cover";
import { getAlbums, getTracks } from "@/utils/music";

export class Searchable<T extends SpoofableEntity> extends ElementWrap {
    public constructor(protected readonly type: SpoofableType, private readonly onSelected?: (entity: T) => void) { super() }

    protected input?: HTMLInputElement;
    private searchResults?: HTMLElement;

    public entity?: T

    protected createElement(): HTMLElement {
        return <div>
            {this.input = <input class={styles.input} oninput={this.onTextChanged.bind(this)} onfocusout={this.onFocusLost.bind(this)}></input> as unknown as HTMLInputElement}
            {this.searchResults = <div hidden={true} class={styles.TabbedArtistSearchResults}/>}
        </div>
    }

    focusMaybe() {
        if (this.input) {
            this.input.focus();
        }
    }

    private timeout?: NodeJS.Timeout;
    private readonly SEARCH_DELAY_MS = 1e3
    private lastQuery?: string;

    protected async search() {
        const q = this.input?.value;
        if (q && q != this.lastQuery) {
            this.lastQuery = q;
            const result = await search(q, this.type);
            if (q != this.input?.value) return;
            this.renderSearchResults(result?.results.map(item => item[this.type] as T).filter(artist => !!artist) ?? []);
        }
    }

    private renderSearchResults(results: T[]) {
        if (!this.searchResults) return;
        this.searchResults.innerHTML = "";
        this.searchResults.hidden = results.length === 0;

        for (const res of results) {
            const result = <button type="button" class={styles.TabbedArtistSearchResult} onmousedown={(ev: MouseEvent) => ev.preventDefault()} onclick={() => this.selectEntity(res)}>
                <Cover mini src={res.coverUri ?? res.ogImage}/>
                <span>{this.type === "artist" ? (res as Artist).name : (res as Release).title}</span>
            </button> as HTMLElement;
            this.searchResults.appendChild(result);
        }
    }

    private selectEntity(entity: T) {
        this.entity = entity;
        this.searchResults?.remove();
        this.input?.remove();
        this.input = undefined;
        this.searchResults = undefined;
        this.onSelected?.(entity);
        this.reRenderElement();
    }

    private onTextChanged(ev: InputEvent) {
        clearTimeout(this.timeout);
        
        const re = new RegExp(`.*/${this.type}\/(\\d+)`);
        if (re.test(this.input?.value ?? "")) {
            const id = this.input?.value?.match(re)![1];
            if (!id) return;
            (this.type == "artist" ? getArtist : this.type == "album" ? getAlbums : getTracks)(id).then((res: any) => { 
                if (Array.isArray(res)) res = res[0];
                this.selectEntity(res) 
            });
        }
        else {
            this.timeout = setTimeout(this.search.bind(this), this.SEARCH_DELAY_MS)
        }
    }

    protected onFocusLost(ev: FocusEvent) {
        if (this.searchResults) {
            this.searchResults.hidden = true;
        }
        if (!this.input?.value) {
            this.element.remove();
        }
        clearTimeout(this.timeout);
    }
}