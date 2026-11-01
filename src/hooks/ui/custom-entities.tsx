import { SpoofableType } from "@/types";
import { listenAddNodes, unlistenAddNodes } from "./observer";
import { getEntityIdFromNode, removeChild } from "@/utils/ui-utils";
import { HeaderActionButton, prepareButtons, unhookButtons } from "./buttons";
import { localizeSpoofableTypeObjectiveCase } from "@/utils/common";
import { isCustomEntityReal } from "@/ui/components/alerts/spoof/custom-entities/custom-entity-id-counter";
import { createSpoofAlertFor } from "@/ui/components/alerts/spoof/spoof-alert";
import { customIdOf } from "@/ui/components/alerts/spoof/custom-entities/custom-entity-requests";
import { getAlbums, getArtist } from "@/utils/music";

const unhooks: ((el: HTMLElement) => void)[] = []

export function unhookCustomEntitiesPages() {
    unhookButtons()
    for (const unhook of unhooks) {
        unlistenAddNodes(unhook);
    }
}

export function prepareCustomEntitiesPages() {
    for (const type of ['album', 'artist'] as const) {
        const listener = (el: HTMLElement) => {
            const removeByTestId = (testId: string) => removeChild(el, `[data-test-id="${testId}"]`);

            removeByTestId('LIKE_BUTTON')
            removeByTestId('PIN_BUTTON')
            removeByTestId('TRAILER_BUTTON')
            removeChild(el, '[data-test-id$="CONTEXT_MENU_BUTTON"]')

            async function onButtonClick(e: Event) {
                const el = e.currentTarget as HTMLElement
                const id = getEntityIdFromNode(el, type);
                const entity = await (type === 'artist' ? getArtist : getAlbums)(String(id))
                createSpoofAlertFor(type, el, Array.isArray(entity) ? entity[0] : entity)
            }

            el.appendChild(<HeaderActionButton icon="edit_xxs" onclick={onButtonClick}>Подменить {localizeSpoofableTypeObjectiveCase(type)}</HeaderActionButton>)
        }

        unhooks.push(listenAddControls(listener, type))
    }

    prepareButtons()
}

function listenAddControls(listener: (el: HTMLElement) => any, entityType: SpoofableType) {
    const PAGE_DATATEST_ID = `${entityType.toUpperCase()}_PAGE`;
    const selector = `[data-test-id="${PAGE_DATATEST_ID}"] [data-test-id="BASE_PAGE_HEADER_CONTROLS"] div`;
    return listenAddNodes((el) => {
        const id = Number(getEntityIdFromNode(el, entityType));
        if (isCustomEntityReal(id)) {
            listener(el)
        }
    }, selector);
}