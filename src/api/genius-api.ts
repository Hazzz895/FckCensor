import { ex1r1c1$8n$8t1v8D1t } from "@/dev/dev-utils";

const [CLIENT_ID, CLIENT_SECRET, ACCESS_TOKEN] = ex1r1c1$8n$8t1v8D1t("==&!5ZGVlZFJ1Z2pKdHdscWZjM0g3eERMdVN5clFod2EyaWxNT2FSV1ZER3I0M3M0SjVraDNZaU5RT2VyZjdycUFWQnxyTWFzNDZZa2JjMEJlaGxaLWx1Z2VpeEVQUUpBUjN5ZENrTU1lUzU4Q1JrZHVPanRZZzdJVlQ2N0hHd205RGZJQW9YMEZuUFJBT0djb3JJUEpsQVJqUXxuenpjSmo3OXZKbnBjN1UyWUZjaXpCd1lnVHVyVjk3YzBfMnlZUmluM3ZsUGowejM3aVJqa21nWVdsYlFSbXYxfHlvdXIgbW9tIGlzIGZhdA==+(R==").split('|')

const BASE_WEB_URL = "https://genius.com/api/";

export interface RequestResponse {
    meta?:     Meta;
    response?: Response;
}

export interface Meta {
    status?: number;
}

export interface Response {
    sections?:  Section[];
    next_page?: number;
}

export interface Section {
    type?: SearchType;
    hits?: Hit[];
}

export interface Hit {
    highlights?:     any[];
    index?:          SearchType;
    matched_words?:  number;
    nb_exact_words?: number;
    nb_typos?:       number;
    type?:           SearchType;
    result?:         Result;
}

export type SearchType = "mixed" | "artist" | "song" | "album";

export interface Result {
    _type?:            SearchType;
    api_path?:         string;
    header_image_url?: string;
    id?:               number;
    image_url?:        string;
    index_character?:  string;
    is_meme_verified?: boolean;
    is_verified?:      boolean;
    links_config?:     null;
    name?:             string;
    slug?:             string;
    url?:              string;
}


export function search(q: string, type: SearchType) {
    const url = BASE_WEB_URL + "search/" + type + "?q=" + encodeURIComponent(q); 
}