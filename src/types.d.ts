//#region FckCensor Types
export interface RemoteList {
    sources: RemoteSource[]
}

export interface RemoteSourceBase {
    tracks?:  Record<string, Track>;
    albums?:  Record<string, Album>;
    artists?: Record<string, Artist>;
    artistsInsertions?: Record<string, ArtistInsertions>;
    tracksStorages?: TracksStorage[];
}

export interface RemoteSource extends RemoteSourceBase {
    supported_version?: string;
}

export interface TrackReplacementStorageBase {
    durationMs?: number
}

export type TrackReplacementStorage = ({
    id: number
} & TrackReplacementStorageBase) | number

export type TrackReplacementStorageTemplate = ({
    url: string
} & TrackReplacementStorageBase) | string

export interface TracksStorage {
    urlTemplate?: string;
    trackIds?:    TrackReplacementStorage[];
    tracks?:      Record<string, TrackReplacementStorageTemplate>;
}

export interface FckCensorSpoofData {
    /** Оригинальные значения до подмены */
    originalValues?: Record<string, any>,
    /** Только для альбомов и треков. Индекс вставки сущности в профиль исполнителя */
    insertionIndex?: number | null,
    /** Только для альбомов с подмененёнными исполнителями. Подменивать ли исполнителей у треков альбома на соответствующих альбому исполнителей*/
    replaceArtistsInAlbumVolumes?: boolean;
    /** Только для треков. ID трека, с которого необходимо скопировать аудиопоток */
    audioSourceId?: string
    
    // /** ID сущности, с которой необходимо скопировать подмену. */
    // matches?: string
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
  bestResults: SearchResult[]
}

export type SearchType = "all" | SpoofableType

export interface SearchResult {
  type: SearchType | "best_result_track" | "best_result_album" | "best_result_artist"
  artist: Artist // | ...
  track: Track;
  album: Album;
  best_result_track: Track;
  best_result_album: Album;
  best_result_artist: Artist
}

export interface Album extends Spoofable {
    id:                        number;
    title?:                    string;
    metaType?:                 string;
    type?: string
    contentWarning?:           string;
    year?:                     number;
    releaseDate?:              string;
    coverUri?:                 string;
    cover?:                    Cover;
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
    id:                              string;
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
    canPublish?:                     boolean;
    durationMs?:                     number;
    fileSize?:                       number;
    r128?:                           any;
    fade?:                           any;
    previewDurationMs?:              number;
    coverUri?:                       string;
    derivedColors?:                  any;
    ogImage?:                        string;
    specialAudioResources?:          string[];
    hasTrackLink?:          boolean;
}

export interface TrackMST extends Track {
    isAvailable: boolean
}

export interface PlaylistTrack {
    id?:        number;
    track?:     Track;
    timestamp?: Date;
    playCount?: number;
    chart?:     Chart;
    recent?:    boolean;
}

export interface Playlist {
    owner?:                any;
    playlistUuid?:         string;
    available?:            boolean;
    uid?:                  number;
    kind?:                 number;
    title?:                string;
    revision?:             number;
    snapshot?:             number;
    trackCount?:           number;
    visibility?:           string;
    collective?:           boolean;
    created?:              Date;
    modified?:             Date;
    isBanner?:             boolean;
    isPremiere?:           boolean;
    durationMs?:           number;
    cover?:                Cover;
    ogImage?:              string;
    tracks?:               PlaylistTrack[];
    tags?:                 any[];
    likesCount?:           number;
    trailer?:              any;
    similarPlaylists?:     Playlist[];
    backgroundVideoUrl?:   string;
    backgroundVideoId?:    string;
    backgroundImageUrl?:   string;
    description?:          string;
    descriptionFormatted?: string;
    backgroundColor?:      string;
    textColor?:            string;
    image?:                string;
    customWave?:           any;
}

export type DiResource = "AfterTrackResource" | "Logger" | "ModelActionsLogger" | "HttpClient" | "HttpBeaconClient" | "Slam" | "UgcUploadHttpClient" | "BaseResourceHttpClient" | "ResourceHttpClient" | "ResourceBeaconClient" | "AccountResource" | "UsersResource" | "LandingResource" | "LandingBlocksResource" | "Landing3Resource" | "AlbumResource" | "SlidesResource" | "Config" | "TokenConfig" | "Storage" | "CookieStorage" | "LocalStorage" | "LibraryResource" | "LumenResource" | "TracksResource" | "SessionStorage" | "TopResource" | "ArtistsResource" | "Authorization" | "RedAlertResource" | "RotorResource" | "WaveResource" | "SearchResource" | "SearchPlaylistResource" | "PlaylistResource" | "PlaylistsResource" | "PinResource" | "MetatagsResource" | "TagResource" | "FeedResource" | "CONTAINER_USER_ID_TOKEN" | "PinsResource" | "MusicHistoryResource" | "ChartResource" | "ClipsResource" | "DynamicPagesResource" | "CONTAINER_I18N_STORAGE" | "LyricViewsResource" | "NonMusicResource" | "DonationResource" | "LoaderResource" | "PrefixlessResource" | "StreamsResource" | "FiltersResource" | "UgcResource" | "CollectionResource" | "AdsResource" | "PersonalResource" | "AvailabilityResource" | "GetFileInfoResource" | "DisclaimersResource" | "DisclaimerDictionary" | "FamilyResource" | "ChildrenLandingResource" | "TelemetryResource" | "Env" | "PromoResource" | "RumResource" | "AcqOffers" | "Ynison" | "LabelsResource" | "RequestExecutionContext" | "ConcertsResource" | "YaMetrikaController" | "RumTransport" | "YaMetrikaTransport" | "WordsResource" | "WheelResource" | "MocksInitializer" | "NetworkMonitorFactory" | "SkeletonSdk"
//#endregion