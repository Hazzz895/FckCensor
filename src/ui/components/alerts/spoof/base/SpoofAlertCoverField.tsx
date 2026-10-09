import { getEntityCoverUri, httpsify } from '@/utils/common'
import { SpoofAlertEntityPropertyField } from './SpoofAlertEntityPropertyField'
import { CoverProps } from '../spoof-alert'
import { SpoofAlertBase } from './SpoofAlertBase'
import { error } from '@/utils/logger'
import { Cover } from '@/ui/components/Cover'
import styles from '@/styles.module.scss'
import { localSource } from '@/api/db-api'

export class SpoofAlertCoverField extends SpoofAlertEntityPropertyField {
    public constructor(alert: SpoofAlertBase) {
        super(alert, 'coverUri')
        this.ready = localSource
            .getCustomCover(this.alert.type, this.alert.id)
            .then(cover => {
                if (cover && !this.disposed && !this.file) {
                    this.onCoverSelected(cover)
                }
            })
            .catch(error)
    }

    readonly ready: Promise<void>
    private currentImageUrl?: string
    private file?: Blob
    private disposed = false

    private onCoverSelected(file: Blob) {
        if (this.disposed) return
        if (this.currentImageUrl) URL.revokeObjectURL(this.currentImageUrl)
        this.file = file
        this.currentImageUrl = URL.createObjectURL(file)
        this.reRenderElement()
    }

    dispose() {
        if (this.disposed) return
        this.disposed = true
        if (this.currentImageUrl) URL.revokeObjectURL(this.currentImageUrl)
    }

    getValue() {
        return this.file ?? getEntityCoverUri(this.alert.entity)
    }

    hasDiffs(prop: any): boolean {
        const original = getEntityCoverUri({
            coverUri: this.originalValue,
            ogImage: this.alert.getOriginalValue('ogImage'),
            cover: this.alert.getOriginalValue('cover'),
        })
        return !!this.file || prop !== original
    }

    protected createElement(): HTMLElement {
        let coverUri = this.currentImageUrl || getEntityCoverUri(this.alert.entity)
        if (coverUri) {
            coverUri = httpsify(coverUri)
        }
        return <ChangableCover onselected={this.onCoverSelected.bind(this)} src={coverUri} />
    }
}

export interface ChangableCoverProps extends CoverProps {
    onselected: (file: File) => void
}

export function ChangableCover({ onselected, ...props }: ChangableCoverProps) {
    function onClick(_: unknown) {
        window
            .showOpenFilePicker({
                types: [
                    {
                        description: 'Изображения',
                        accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
                    },
                ],
                multiple: false,
            })
            .then(async fileHandles => {
                const fileHandle = fileHandles[0]
                const file = await fileHandle.getFile()
                if (!file.type.startsWith('image/')) {
                    return
                }

                onselected(file)
            })
            .catch(e => error(e))
    }

    const element = (
        <div
            onclick={onClick}
            class={`qaIScXjx1qyXuaIHXQIo emVxQKB1wJc9FwuIBG8o ZcpulvHgF_wsgzB8Hye9 ${styles.ChangableCoverRoot} ${styles.ChangableCoverRoot_hoverable}`}
        >
            <button
                class={`cpeagBA1_PblpJn8Xgtv iJVAJMgccD4vj4E4o068 dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p nHWc2sto1C6Gm0Dpw_l0 qU2apWBO1yyEK0lZ3lPO ${styles.ChangableCoverRoot_button}`}
                type="button"
                aria-label="Просмотр обложки"
                tabindex="0"
                aria-live="off"
                aria-busy="false"
            >
                <Cover {...props} />
            </button>
            <div class={`${styles.ChangableCoverRoot_buttonContainer} ${styles.CursorPointer}`}>
                <div class={`${styles.ChangableCoverRoot} ${styles.ChangableCoverRoot_fileUploader_hovered}`}>
                    <button
                        class={`cpeagBA1_PblpJn8Xgtv iJVAJMgccD4vj4E4o068 zIMibMuH7wcqUoW7KH1B IlG7b1K0AD7E7AMx6F5p nHWc2sto1C6Gm0Dpw_l0 oR11LfCBVqMbUJiAgknd qU2apWBO1yyEK0lZ3lPO ${styles.ChangableCoverRoot_fileUploader_button}`}
                        type="button"
                        aria-label="Добавить обложку"
                        data-test-id="PLAYLIST_HEADER_ADD_COVER_BUTTON"
                        aria-live="off"
                        aria-busy="false"
                    >
                        Изменить обложку
                    </button>
                </div>
            </div>
        </div>
    )
    return element
}
