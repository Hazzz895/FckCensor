import { JSX } from '@/jsx-runtime'
import { listenAddNodes, unlistenAddNodes } from './observer'
import { Artist, OuterArtist, SpoofableEntity, SpoofableType } from '@/types'
import { createCustomAlbumAlertFor, createCustomTrackAlertFor } from '@/ui/components/alerts/spoof/custom-entities/custom-entities-alert'
import { getSdkApi } from '@/sdk/lifecycle'
import { localizeSpoofableType } from '@/utils/common'
import { USE_CUSTOM_TRACKS } from '@/../build-info'

const unhooks: ((el: HTMLElement) => void)[] = []

export function unhookButtons() {
    for (const unhook of unhooks) {
        unlistenAddNodes(unhook);
    }
    unhooks.length = 0
}

export function prepareButtons() {
    if (unhooks.length) return

    /*unhooks.push(listenAddNodes(el => {
        el.classList.add('PageHeaderPlaylist_controls__uSwwK')
        el.appendChild(
            <div class="PageHeaderPlaylist_ugcControls__9q8Ne">
                <AddTrackButton>Добавить трек</AddTrackButton>
            </div>,
        )
    }, ':is(.PageHeaderArtist_root__QhL_a, .CommonAlbumPage_header__jS_be) [data-test-id="BASE_PAGE_HEADER_CONTROLS"]'))*/

    const Q_CONTAINER_SELECTOR = ':is([data-test-id="TEXT_HEADER"], [data-test-id="TEXT_STICKY_HEADER"]):not(:has([fckcensorbutton])'

    if (USE_CUSTOM_TRACKS) {
        unhooks.push(listenAddNodes(el => {
            addAddCustomEntityButton(el, 'track', createCustomTrackAlertFor)
        }, '[data-test-id="ARTIST_TRACKS_PAGE"] ' + Q_CONTAINER_SELECTOR))
    }

    unhooks.push(listenAddNodes(el => {
        addAddCustomEntityButton(el, 'album', createCustomAlbumAlertFor)
    }, '[data-test-id="ARTIST_ALBUMS_PAGE"] ' + Q_CONTAINER_SELECTOR))
}

function addAddCustomEntityButton(container: HTMLElement, type: SpoofableType, listener: (artist: Artist, scrim: HTMLElement | undefined) => any) {
    function onClick(e: Event) {
        const el = e.currentTarget as HTMLElement
        if (!el) return;
        getSdkApi()?.pulsesyncApi?.getPageEntity().then(
            pageData => {
                if (pageData?.type != 'artist') return
                let entity = pageData.entity as OuterArtist | Artist;
                listener("artist" in entity ? entity.artist : entity, el)
            }
        )
    }
    
    const button = <HeaderActionButton
        style="margin-left: auto"
        icon="add_xxxs"
        onclick={onClick}>
            {`Добавить ${localizeSpoofableType(type)}`}
    </HeaderActionButton>;

    container.appendChild(button)
    return button;
}

export function HeaderActionButton({ children, icon, ...props }: JSX.HTMLAttributes) {
    return (
        <button
            class="kc5CjvU5hT9KEj0iTt3C cpeagBA1_PblpJn8Xgtv iJVAJMgccD4vj4E4o068 zIMibMuH7wcqUoW7KH1B IlG7b1K0AD7E7AMx6F5p nHWc2sto1C6Gm0Dpw_l0 WtFdWDF44egSVM_YiMUX qU2apWBO1yyEK0lZ3lPO PageHeaderPlaylistUgcUploadButton_button__mWtCr"
            fckcensorbutton
            {...props}
        >
            <span class="JjlbHZ4FaP9EAcR_1DxF">
                {icon && (
                    <svg class="J9wTKytjOWG73QMoN5WP elJfazUBui03YWZgHCbW l3tE1hAMmBj2aoPPwU08">
                        <use xlink:href={`/icons/sprite.svg#${icon}`}></use>
                    </svg>
                )}
                {children}
            </span>
        </button>
    )
}
