import { JSX } from '@/jsx-runtime'
import { listenAddNodes, unlistenAddNodes } from './observer'
import { debug } from '@/utils/logger'
import { localSource } from '@/api/db-api';
import addonConfig from '../../../addon.config.mjs';

let listener: null | ((el: HTMLElement) => void) = null

export function toggleSettingsHook(value: boolean) {
    if ((value && listener) || (!value && !listener)) return;

    if (value) {
        prepareSettingsOptions();
    }
    else if (listener) {
        unlistenAddNodes(listener);
    }
}

export function prepareSettingsOptions() {
    listener = listenAddNodes(settingsList => {
        settingsList.insertBefore(<SettingsItem onclick={showConfirmationModal}>Очистить базу данных FckCensor</SettingsItem>, settingsList.children[1])
    }, '[data-test-id="SETTINGS_LIST"]')
}

async function showConfirmationModal() {
    const confirmed = await window?.pulsesyncApi?.showModal?.("confirm", { title: `Вы действительно хотите очистить базу данных аддона ${addonConfig.name}?`, "message": `Это очистит все пользовательские данные аддона ${addonConfig.name}, а именно подмены информации о альбомах, исполнителях, треках (и их аудиопотоки), которые были подменены вручную через окна подмены. Это действие невозможно отменить.` });
    if (confirmed) {
        await localSource.deleteDb();
        window?.pulsesyncApi?.showNotification?.("База данных FckCensor очищена.", "info");
    }   
}

export function SettingsItem({ children, onclick }: JSX.HTMLAttributes) {
    return <li class="Settings_item__Ksa9h">
        <button
            class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p j1jXIVckFgZECecFzZMe qU2apWBO1yyEK0lZ3lPO BbCxxIjBGupN28bq2lSP et24Jf7pT_X9Fvc7TznR SettingsListButtonItem_root__3dtV2 SettingsListButtonItem_important__AcEon"
            type="button"
            aria-live="off"
            aria-busy="false"
            onclick={onclick}
        >
            <span class="JjlbHZ4FaP9EAcR_1DxF iOlzvyUREgDkthkrx7Sf SettingsListButtonItem_contentContainer__jqoKg">
                <div class="SettingsListButtonItem_content___Opuo">
                    <div
                        title={children?.toString()}
                        class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI V3WU123oO65AxsprotU9 Vi7Rd0SZWqD17F0872TB SettingsListButtonItem_title__npCza"
                        style="-webkit-line-clamp: 1;"
                    >
                        {children}
                    </div>
                </div>
                <svg
                    class="J9wTKytjOWG73QMoN5WP RBoEbyJKP5rEtLsXM1ji SettingsListButtonItem_icon__WULZ1 UwnL5AJBMMAp6NwMDdZk"
                    focusable="false"
                    aria-hidden="true"
                >
                    <use xlink:href="/icons/sprite.svg#arrowRight_xs"></use>
                </svg>
            </span>
        </button>
    </li>
}
