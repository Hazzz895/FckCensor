import { debug } from '@/utils/logger'
import { toggleModMenu } from './mod-menu'
import { IS_MODERATION_BUILD } from '@/../build-info'

let moderationMode = false

export function isModerationMode() {
    return moderationMode
}

export function setIsModerationMode(value: boolean) {
    toggleModMenu(value)
    moderationMode = value
}
