import { httpsify } from "@/utils/common";
import { SpoofAlertEntityPropertyField } from "./SpoofAlertEntityPropertyField";
import { CoverProps } from "../spoof-alert";
import { SpoofAlertBase } from "./SpoofAlertBase";
import { error } from "@/utils/logger";
import { Cover } from "@/ui/components/Cover";

export class SpoofAlertCoverField extends SpoofAlertEntityPropertyField {
    public constructor(alert: SpoofAlertBase) {
        super(alert, "coverUri", alert.entity.coverUri);
    }

    private currentImageUrl?: string;
    private file?: File;

    private onCoverSelected(file: File) {
        if (this.currentImageUrl) URL.revokeObjectURL(this.currentImageUrl);
        this.file = file;
        this.currentImageUrl = URL.createObjectURL(file);
        this.reRenderElement();
    }

    valueToProperty() {
        return this.file;
    }

    hasDiffs(prop: any): boolean {
        return prop !== this.alert.entity.coverUri;
    }

    protected createElement(): HTMLElement {
        let coverUri = this.currentImageUrl || this.alert.entity.coverUri || this.alert.entity.ogImage;
        if (coverUri) {
            coverUri = httpsify(coverUri);
        }
        return <ChangableCover onselected={this.onCoverSelected.bind(this)} src={coverUri}/>;
    }

}

export interface ChangableCoverProps extends CoverProps {
    onselected: (file: File) => void
}

export function ChangableCover({ onselected, ...props }: ChangableCoverProps) {
    function onClick(_: unknown) {
        window.showOpenFilePicker({
            types: [
                {
                    description: "Изображения",
                    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
                },
            ],
            multiple: false,
        })
            .then(async (fileHandles) => {
                const fileHandle = fileHandles[0];
                const file = await fileHandle.getFile();
                if (!file.type.startsWith("image/")) {
                    return;
                }

                onselected(file);
            })
            .catch((e) => error(e));
    }

    const element = <div onclick={onClick} class="qaIScXjx1qyXuaIHXQIo emVxQKB1wJc9FwuIBG8o ZcpulvHgF_wsgzB8Hye9 PageHeaderPlaylistCover_root__Vdn75 PageHeaderPlaylistCover_root_hoverable__ZeqpX">
        <button class="cpeagBA1_PblpJn8Xgtv iJVAJMgccD4vj4E4o068 dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p nHWc2sto1C6Gm0Dpw_l0 qU2apWBO1yyEK0lZ3lPO PageHeaderPlaylistCover_coverButton__dw0rj" type="button" aria-label="Просмотр обложки" tabindex="0" aria-live="off" aria-busy="false">
            <Cover {...props}/>
        </button>
        <div class="PageHeaderPlaylistCover_buttonContainer__OkEaT PageHeaderPlaylistCover_buttonContainer_withCursorPointer__pnzha">
            <div class="PageHeaderPlaylistCover_fileUploadContainer___JnqP PageHeaderPlaylistCover_fileUploadContainer_hovered__RtD_X">
                <button class="cpeagBA1_PblpJn8Xgtv iJVAJMgccD4vj4E4o068 zIMibMuH7wcqUoW7KH1B IlG7b1K0AD7E7AMx6F5p nHWc2sto1C6Gm0Dpw_l0 oR11LfCBVqMbUJiAgknd qU2apWBO1yyEK0lZ3lPO PageHeaderPlaylistCover_button__vCYgD" type="button" aria-label="Добавить обложку" data-test-id="PLAYLIST_HEADER_ADD_COVER_BUTTON" aria-live="off" aria-busy="false">
                    Изменить обложку
                </button>
            </div>
        </div>
    </div>
    return element;
}