import { Album, Artist } from "@/types";
import { SpoofAlbumAlert } from "../../album/SpoofAlbumAlert";
import { JSX } from "@/jsx-runtime";
import { localSource } from "@/api/db-api";
import { increseCustomEntityId } from "../custom-entity-id-counter";

export class CustomAlbumAlert extends SpoofAlbumAlert {
    public constructor(data: Album, scrim?: HTMLElement) {
        super(data, scrim, 'Добавить пользовательский альбом')
    }

    protected onApply(spoofData: Album): Promise<void> {
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