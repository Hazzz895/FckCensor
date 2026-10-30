import { Album, Artist } from "@/types";
import { SpoofAlbumAlert } from "../../album/SpoofAlbumAlert";
import { JSX } from "@/jsx-runtime";

export class CustomAlbumAlert extends SpoofAlbumAlert {
    public constructor(data: Album, scrim?: HTMLElement) {
        super(data, scrim, 'Создать пользовательский альбом')
    }

    protected shouldIncludeSpoofField(propertyName: string | undefined, hasDiffs: boolean): boolean {
        return propertyName === 'artists' || super.shouldIncludeSpoofField(propertyName, hasDiffs)
    }

    protected getAdditionalButtons(): JSX.Child {
        return null;
    }
}