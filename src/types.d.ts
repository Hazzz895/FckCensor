//#region FckCensor Types
export interface RemoteList {
    sources: RemoteSource[]
}

export interface RemoteSourceBase {
    tracks:  Record<string, Track>;
    albums:  Record<string, Album>;
    artists: Record<string, Artist>;
    tracks_storages: TracksStorage[];
}

export interface RemoteSource extends RemoteSourceBase {
    supported_version: string;
}

export interface TracksStorage {
    url_template?: string;
    track_ids?:    number[];
    tracks?:       Record<string, string?>;
}

export interface FckCensorSpoofData {
    originalValues?: Record<string, any>
}

export interface Spoofable {
    __fckCensor?: FckCensorSpoofData
}

export type SpoofableType = "album" | "artist" | "track"

export type Release = Album | Track

export type SpoofableEntity = Release | Artist

//#endregion

//#region  Yandex Music Types

export interface SearchResponse {
  searchRequestId: string
  text: string
  misspellCorrected: boolean
  lastPage: boolean
  perPage: number
  results: SearchResult[]
  responseType: string
}

export type SearchType = "all" | "artist"

export interface SearchResult {
  type: SearchType
  artist: Artist // | ...
}

export interface Album extends Spoofable {
    id:                        number;
    title?:                    string;
    metaType?:                 string;
    contentWarning?:           string;
    year?:                     number;
    releaseDate?:              Date;
    coverUri?:                 string;
    ogImage?:                  string;
    genre?:                    string;
    trackCount?:               number;
    likesCount?:               number;
    recent?:                   boolean;
    veryImportant?:            boolean;
    artists?:                  Artist[];
    labels?:                   any[];
    available?:                boolean;
    availableForPremiumUsers?: boolean;
    availableForOptions?:      string[];
    availableForMobile?:       boolean;
    availablePartially?:       boolean;
    bests?:                    any[];
    disclaimers?:              string[];
    listeningFinished?:        boolean;
    trackPosition?:            any;
    volumes?:                  Track[][];
}

export interface OuterArtist extends Spoofable {
    artist:               InnerArtist;
    albums?:              Album[];
    alsoAlbums?:          Album[];
    lastReleaseIds?:      number[];
    popularTracks?:       Track[];
    bandlinkScannerLink?: any;
    similarArtists?:      InnerArtist[];
    allCovers?:           Cover[];
    concerts?:            any[];
    videos?:              any[];
    clips?:               any[];
    vinyls?:              any[];
    hasPromotions?:       boolean;
    tracksInChart?:       any[];
    lastReleases?:        Album[];
    extraActions?:        any[];
    stats?:               any;
    customWave?:          any;
    playlistIds?:         Playlist[];
    playlists?:           Playlist[];
    links?:               any[];
    hasTrailer?:          boolean;
}

export interface Artist extends Spoofable {
    id:                string;
    name?:             string;
    various?:          boolean;
    composer?:         boolean;
    cover?:            Cover;
    coverUri?:         string;
    ogImage?:          string;
    genres?:           string[];
    counts?:           Counts;
    available?:        boolean;
    disclaimers?:      any[];
    ratings?:          any;
    links?:            any[];
    ticketsAvailable?: boolean;
    likesCount?:       number;
    fullNames?:        string[];
    description?:      any;
    countries?:        string[];
    initDate?:         Date;
    enWikipediaLink?:  string;
    dbAliases?:        string[];
    extraActions?:     any[];
    hasTrailer?:       boolean;
    trailer?:          any;
    derivedColors?:    DerivedColors;
}

export interface Counts {
    tracks?:       number;
    directAlbums?: number;
    alsoAlbums?:   number;
    alsoTracks?:   number;
}

export interface Cover {
    uri?:           string;
    color?:         string;
    derivedColors?: DerivedColors;
    prefix?:        string;
}

export interface DerivedColors {
    average?:    string;
    waveText?:   string;
    miniPlayer?: string;
    accent?:     string;
}

export interface Track extends Spoofable {
    id:                              TrackId;
    realId?:                         string;
    title?:                          string;
    contentWarning?:                 string;
    available?:                      boolean;
    availableForPremiumUsers?:       boolean;
    availableFullWithoutPermission?: boolean;
    availableForOptions?:            string[];
    disclaimers?:                    string[];
    artists?:                        Artist[];
    albums?:                         Album[];
    lyricsAvailable?:                boolean;
    type?:                           string;
    rememberPosition?:               boolean;
    trackSharingFlag?:               string;
    lyricsInfo?:                     any;
    trackSource?:                    string;
    error?:                          string;
    major?:                          any;
    storageDir?:                     any;
    durationMs?:                     number;
    fileSize?:                       number;
    r128?:                           any;
    fade?:                           any;
    previewDurationMs?:              number;
    coverUri?:                       string;
    derivedColors?:                  any;
    ogImage?:                        string;
    specialAudioResources?:          string[];
}

export interface TrackMST extends Track {
    isAvailable: boolean
}
//#endregion
