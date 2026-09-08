import { Release } from "@/types";
import { Cover } from "@/ui/components/Cover";
import ElementWrap from "@/ui/components/ElementWrap";
import { CloseButton } from "../../../alerts";

export function ReleaseNode({ release, onremove }: { release?: Release; onremove: (ev: MouseEvent) => void }) {
    return <div class="HorizontalCardContainer_root__YoAAP CommonTrack_root__i6shE">
            <div class="PlayButtonWithCover_root__s6Orw TrackPlaylist_playButtonCell__Q6YT_">
                <Cover mini={true} src={release?.coverUri ?? release?.ogImage}/>
            </div>
            <div class="Meta_root__R8n1h" style="align-items: flex-start; flex-direction: column">
                <div class="Meta_titleContainer__gDuXr">{release?.title ?? (release?.id ? `ID: ${release.id}` : "...")}</div>
                {release && (release?.artists?.length ?? 0) > 0 ? <div class="SeparatedArtists_root_variant_breakAll__34YbW SeparatedArtists_root_clamp__SyvjM Meta_text__Y5uYH Meta_artists__VnR52">{String(release.artists?.map(x => x.name).join(", "))}</div> : undefined}
            </div>
            <CloseButton onclick={onremove}/>
        </div>;
}
