import { defineAddonSettings, SettingType } from '@pulsesync/addon-sdk'

export const settings = defineAddonSettings(
    [
        {
            title: 'Упрощённый режим',
            items: {
                liteMode: {
                    type: SettingType.BOOLEAN,
                    name: 'Упрощённый режим',
                    description:
                        'Переключает состояние Упрощённого Режима. Когда включено, подмениваются только аудиопотоки треков. Свойства сущностей (названия, обложки и др.) перестают подмениваться аддоном. Включите это если приложение не запускается или сильно нагружается. Подробнее читайте в FAQ.',
                    default: false,
                },
            },
        }
    ]
)
