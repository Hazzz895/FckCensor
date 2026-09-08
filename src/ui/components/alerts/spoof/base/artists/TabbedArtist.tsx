import { JSX } from "@/jsx-runtime";
import { Artist } from "@/types";
import ElementWrap from "@/ui/components/ElementWrap";
import { searchArtists } from "@/utils/music";
import { debug } from "@/utils/logger";
import { Cover } from "../../../../Cover";
import styles from "@/styles.module.scss";
import { eventHandlerForTooltip } from "@/ui/tooltips";
import { Searchable } from "@/ui/components/Searchable";

export interface TabbedArtistProps extends JSX.HTMLAttributes {
    artist?: Artist
}

export class TabbedArtist extends Searchable<Artist> {
    constructor(artist?: Artist) {
        super("artist");
        this.entity = artist;
    }

    createElement(): HTMLElement {
        let children: JSX.Child = [];
        if (this.entity) {
            children = 
                [<Cover mini style="width: 24px; height: 24px; margin-right: 4px; border-radius: 100%" src={this.entity.coverUri ?? this.entity.ogImage ?? this.entity.cover?.uri}/>,
                this.entity.name]
        }
        else {
            children = super.createElement();
        }

        return <div aria-label="нажмит чтобы удалить" onmouseenter={eventHandlerForTooltip} class={styles.TabbedArtist}>
            {children}
             </div>
    }

    protected onFocusLost(ev: FocusEvent) {
        if (!this.entity && this.input) {
            this.entity = { "name": this.input.value } as Artist
        }
    }
}