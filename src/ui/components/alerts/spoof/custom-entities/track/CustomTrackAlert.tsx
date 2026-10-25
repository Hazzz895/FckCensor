import { Track } from "@/types";
import { SpoofTrackAlert } from "../../track/SpoofTrackAlert";
import { JSX } from "@/jsx-runtime";
import { increseCustomEntityId } from "../custom-entity-id-counter";

export class CustomTrackAlert extends SpoofTrackAlert {
    public constructor(data: Track, scrim?: HTMLElement) {
        super(data, scrim, 'Добавить пользовательский трек')
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