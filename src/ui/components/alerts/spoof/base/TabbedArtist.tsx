import { JSX } from "@/jsx-runtime";
import { Artist } from "@/types";
import ElementWrap from "@/ui/components/ElementWrap";
import { searchArtists } from "@/utils/music";
import { debug } from "@/utils/logger";
import { Cover } from "../../../Cover";
import styles from "@/styles.module.scss";

export interface TabbedArtistProps extends JSX.HTMLAttributes {
    artist?: Artist
}

export class TabbedArtist extends ElementWrap {
    private artist?: Artist;

    constructor(artist?: Artist) {
        super();
        this.artist = artist;
    }

    private input?: HTMLInputElement;
    private searchResults?: HTMLElement;

    createElement(): HTMLElement {
        if (!this.artist) {
            this.input = <input class={styles.input} oninput={this.onArtistTextChanged.bind(this)} onfocusout={this.onFocusLost.bind(this)}/> as unknown as HTMLInputElement
            this.searchResults = <div hidden={true} class={styles.TabbedArtistSearchResults}/>
        }

        debug(this.artist, this.artist?.coverUri ?? this.artist?.ogImage ?? this.artist?.cover?.uri)

        return <div class={styles.TabbedArtist}> 
                {this.artist && <Cover mini style="width: 24px; height: 24px; margin-right: 4px; border-radius: 100%" src={this.artist.coverUri ?? this.artist.ogImage ?? this.artist.cover?.uri}/>}
                {this.artist && this.artist.name}
                {this.input}
                {this.searchResults}
            </div>
    }

    focusMaybe() {
        if (this.input) {
            this.input.focus();
        }
    }

    private onFocusLost(ev: FocusEvent) {
        if (this.searchResults) {
            this.searchResults.hidden = true;
        }
        if (!this.input?.value) {
            this.element.remove();
        }
        else if (!this.artist) {
            this.artist = { "name": this.input.value } as Artist
        }
    }

    private timeout?: NodeJS.Timeout;
    private readonly SEARCH_DELAY_MS = 1e3
    private lastQuery?: string;

    private onArtistTextChanged(ev: InputEvent) {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        this.timeout = setTimeout(this.searchArtists.bind(this), this.SEARCH_DELAY_MS)
    }

    private async searchArtists() {
        const q = this.input?.value;
        if (q && q != this.lastQuery) {
            this.lastQuery = q;
            const result = await searchArtists(q);
            if (q != this.input?.value) return;
            this.renderSearchResults(result?.results.map(item => item.artist).filter(artist => !!artist) ?? []);
        }
    }

    private renderSearchResults(artists: Artist[]) {
        if (!this.searchResults) return;
        this.searchResults.innerHTML = "";
        this.searchResults.hidden = artists.length === 0;

        for (const artist of artists) {
            const result = <button type="button" class={styles.TabbedArtistSearchResult} onmousedown={(ev: MouseEvent) => ev.preventDefault()} onclick={() => this.selectArtist(artist)}>
                <Cover mini src={artist.coverUri ?? artist.ogImage ?? artist.cover?.uri}/>
                <span>{artist.name}</span>
            </button> as HTMLElement;
            this.searchResults.appendChild(result);
        }
    }
 
    private selectArtist(artist: Artist) {
        this.artist = artist;
        this.searchResults?.remove();
        this.input?.remove();
        this.input = undefined;
        this.searchResults = undefined;
        this.reRenderElement();
    }

    getArtist(): Artist | null {
        if (this.artist) {
            return this.artist;
        }
        return null;
    }
}