import { createElement } from 'react'
import { IconButton, Tooltip, usePage, type SlotProps } from '@pulsesync/addon-sdk'
import { editAlbum } from '@/hooks/ui/options'
import { getArtist } from '@/utils/music'
import { createArtistSpoofAlertFor } from '@/ui/components/alerts/spoof/spoof-alert'

export function SpoofHeaderAction(_props: SlotProps<'entityHeaderControls'>) {
    const page = usePage()
    if (page?.type !== 'album' && page?.type !== 'artist') return null
    const id = (page.entity as { id?: string | number } | undefined)?.id
    if (id === undefined) return null
    const label = page.type === 'album' ? 'Подменить альбом' : 'Подменить исполнителя'
    const button = createElement(IconButton, {
        icon: 'edit',
        label,
        size: 's',
        variant: 'outline',
        onClick: async () => {
            if (page.type === 'album') await editAlbum(String(id))
            else createArtistSpoofAlertFor(undefined, await getArtist(String(id)))
        },
    })
    return createElement(Tooltip, { content: label, children: button })
}
