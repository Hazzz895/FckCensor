import { Track } from "@/types";
import { JSX } from "@/jsx-runtime";
import { SpoofTrackAlert } from "../../track/SpoofTrackAlert";
import { increseCustomEntityId } from "../custom-entity-id-counter";
import { unused } from "@/utils/common";

@unused("Пользовательский исполнитель создается автоматически.")
export class CustomArtistAlert extends SpoofTrackAlert {
    public constructor(data: Track, scrim?: HTMLElement) {
        super(data, scrim, 'Создать пользовательского исполнителя')
    }

    protected onApply(spoofData: Track): Promise<void> {
        increseCustomEntityId();
        return super.onApply(spoofData)
    }

    protected shouldIncludeSpoofField(propertyName: string | undefined, hasDiffs: boolean): boolean {
        return propertyName === 'artists' || super.shouldIncludeSpoofField(propertyName, hasDiffs)
    }

    protected getAdditionalButtons(): JSX.Child {
        return null;
    }
}