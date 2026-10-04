import { Track } from "@/types";
import { trackToQuery } from "@/utils/music";

const BASE_GENIUS_URL = "https://genius.com/api/";

export async function getGeniusTrackLyrics(query: string | Track) {
    if (!query) return null;

    if (typeof query === "object") {
        query = trackToQuery(query);
    }

    const q = String(query);

    const searchResults = await searchGenius(q, "song");
    if (!searchResults?.length) return null;

    const result = searchResults[0];
    if (!result?.result?.url) return null;

    const response = await fetch(result.result.url);
    if (!response.ok) return null;

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    doc.querySelectorAll('[data-exclude-from-selection="true"]').forEach(node => {
        node.remove();
    });

    const containers = [
        ...doc.querySelectorAll<HTMLElement>(
            '[data-lyrics-container="true"]'
        ),
    ];
    if (!containers.length) {
        return null;
    }

    const lyrics = containers
        .map(container => {
            container.querySelectorAll("br").forEach(br => {
                br.replaceWith("\n");
            });
            return container.textContent?.trim() ?? "";
        })
        .filter(Boolean)
        .join("\n\n");

    return lyrics || null;
}

export async function searchGenius(q: string, type: SearchType) {
    const url =
        BASE_GENIUS_URL +
        "search/" +
        type +
        "?q=" +
        encodeURIComponent(q);

    const response = await fetch(url);
    if (!response.ok) return null;

    const json = await response.json() as RequestResponse;

    const sections = json.response?.sections;
    if (!sections) return null;

    return sections.reduce(
        (acc: Hit[], section) => [
            ...acc,
            ...(section.hits ?? []),
        ],
        []
    );
}

interface RequestResponse {
    meta?:     Meta;
    response?: Response;
}

interface Meta {
    status?: number;
}
interface Response {
    sections?:  Section[];
    next_page?: number;
}

interface Section {
    type?: SearchType;
    hits?: Hit[];
}

interface Hit {
    highlights?:     any[];
    index?:          SearchType;
    matched_words?:  number;
    nb_exact_words?: number;
    nb_typos?:       number;
    type?:           SearchType;
    result?: Result;
    url?:            string;
}

type SearchType = "mixed" | "artist" | "song" | "album";

interface Result {
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
