import { Release } from "@/types";
import { Cover } from "@/ui/components/Cover";
import ElementWrap from "@/ui/components/ElementWrap";
import { CloseButton } from "../../../alerts";
import styles from "@/styles.module.scss";
import { eventHandlerForTooltip } from "@/ui/tooltips";
import { computeStyle } from "@/utils/ui-utils";

export function ReleaseNode({
    release,
    onremove,
    index,
    onIndexChange,
    disableUp,
    disableDown,
}: {
    release?: Release;
    onremove: (ev: MouseEvent) => void;
    index?: number;
    onIndexChange?: (index: number) => void;
    disableUp?: boolean;
    disableDown?: boolean;
}) {
    const displayIndex = index !== undefined && index >= 0 ? index + 1 : index;

    const handleIndexInput = (ev: Event) => {
        const raw = (ev.target as HTMLInputElement).value;
        const parsed = Number(raw);
        if (raw === "" || Number.isNaN(parsed)) {
            return;
        }
        onIndexChange?.(parsed > 0 ? parsed - 1 : -1);
    };

    let indexControls;
    if (displayIndex === undefined) {
        indexControls = <div class={styles.IndexControls}>
            <button
                type="button"
                class={styles.IndexButton}
                disabled={disableUp || undefined}
                style={disableUp ? "opacity: 0.35; pointer-events: none;" : undefined}
                onclick={() => { if (!disableUp) onIndexChange?.(-1); }}
                aria-label="Переместить трек вверх"
                onmouseenter={eventHandlerForTooltip}
            >
                <svg class={styles.IndexTriangle} viewBox="0 0 100 100" aria-hidden="true">
                    <path d="M 50 22 Q 50 16 56 22 L 88 62 Q 94 70 82 70 L 18 70 Q 6 70 12 62 L 44 22 Q 50 16 50 22 Z"/>
                </svg>
            </button>

            <button
                type="button"
                class={styles.IndexButton}
                disabled={disableDown || undefined}
                style={disableDown ? "opacity: 0.35; pointer-events: none;" : undefined}
                onclick={() => { if (!disableDown) onIndexChange?.(1); }}
                aria-label="Переместить трек вниз"
                onmouseenter={eventHandlerForTooltip}
            >
                <svg class={styles.IndexTriangle} viewBox="0 0 100 100" aria-hidden="true">
                    <path d="M 50 78 Q 50 84 56 78 L 88 38 Q 94 30 82 30 L 18 30 Q 6 30 12 38 L 44 78 Q 50 84 50 78 Z" />
                </svg>
            </button>
        </div>
    }
    else {
        indexControls = <input type="number" step="1" style="width: 5rem !important;" value={displayIndex} placeholder={String(displayIndex)} class={styles.i + " " + "EditContentModal_input__8O8GH"} oninput={handleIndexInput}/>
    }

    return <div class="HorizontalCardContainer_root__YoAAP CommonTrack_root__i6shE">
            <div class="PlayButtonWithCover_root__s6Orw TrackPlaylist_playButtonCell__Q6YT_">
                <Cover mini={true} src={release?.coverUri ?? release?.ogImage}/>
            </div>
            <div class="Meta_root__R8n1h" style="align-items: flex-start; flex-direction: column">
                <div class="Meta_titleContainer__gDuXr">{release?.title ?? (release?.id ? `ID: ${release.id}` : "...")}</div>
                {release && (release?.artists?.length ?? 0) > 0 ? <div class="SeparatedArtists_root_variant_breakAll__34YbW SeparatedArtists_root_clamp__SyvjM Meta_text__Y5uYH Meta_artists__VnR52">{String(release.artists?.map(x => x.name).join(", "))}</div> : undefined}
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
                {indexControls}
                <CloseButton onclick={onremove}/>
            </div>
        </div>;
}