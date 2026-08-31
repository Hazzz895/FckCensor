import { httpsify } from "@/utils/common";
import { CoverProps } from "./alerts/spoof/spoof-alert";


export function Cover({ src, mini = false, ...props }: CoverProps) {
    const roundClass = mini ? "wdE2qVRIlWUesuBfzCis" : "emVxQKB1wJc9FwuIBG8o"
    if (src) {
        src = httpsify(src);

        const src300 = src.replace("%%", mini ? "30x30" : "300x300");
        const src600 = src.replace("%%", mini ? "50x50" : "600x600");
        return (
            <img
                class={"qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG PageHeaderPlaylistCover_coverImage__OC58K " + roundClass}
                alt=""
                loading="eager"
                data-test-id="ENTITY_COVER_IMAGE"
                srcset={`${src300}, ${src600} 2x`}
                src={src300}
                {...props} />
        );
    } else {
        return (
            <div class={"iha4fse_uYSR5XdCNFvU " + roundClass} data-test-id="ENTITY_COVER_NULL_IMAGE" {...props}>
                <svg class="IXo8WeM40YvVigqgCP7J UwnL5AJBMMAp6NwMDdZk" focusable="false" aria-hidden="true">
                    <use xlink:href="/icons/sprite.svg#note_xs"></use>
                </svg>
            </div>
        );
    }
}
