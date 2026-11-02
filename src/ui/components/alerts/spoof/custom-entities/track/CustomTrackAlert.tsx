import { Track } from "@/types";
import { SpoofTrackAlert } from "../../track/SpoofTrackAlert";
import { JSX } from "@/jsx-runtime";
import { TutorialTooltip } from "@/hooks/ui/tutorial";

export class CustomTrackAlert extends SpoofTrackAlert {
    public constructor(data: Track, scrim?: HTMLElement) {
        super(data, scrim, 'Создать пользовательский трек')
    }

    protected getChildren() {
        const warning = (
            <TutorialTooltip id={null!} onclose={() => warning.remove()} class="QhR4J536RmNHBB5bZYwF EditContentModal_field__rexIL">
                Создавать пользовательские треки через аддон не рекомендуется, их нельзя добавлять в плейлисты или лайкать. Вместо этого воспользуйтесь встроенной функцией Яндекс.Музыки по загрузке локальных треков. 
            </TutorialTooltip>
        )
        return <div>
            {warning}
            {super.getChildren()}
        </div>
    }

    protected shouldIncludeSpoofField(propertyName: string | undefined, hasDiffs: boolean): boolean {
        return propertyName === 'artists' || super.shouldIncludeSpoofField(propertyName, hasDiffs)
    }

    protected getAdditionalButtons(): JSX.Child {
        return null;
    }
}