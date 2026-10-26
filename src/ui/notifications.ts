import { Notification } from "@/types";
import { versionsSatisfies } from "@/utils/version-utils";
import { modals, notifications as sdkNotifications } from "@pulsesync/addon-sdk";
import { openExternalLink } from "@/utils/common";
import addonConfig from "../../addon.config.mjs";

export function handleNotifications(notifications: Notification[]) {
    for (const notification of notifications) {
        if ((notification.version && !versionsSatisfies(addonConfig.version, notification.version)) ||
            (notification.expires && new Date(notification.expires) < new Date()) ||
            isNotificationHandled(notification) ||
            !notification.message) continue;
        
        const message = notification.message

        if (notification.type === "notification") {
            const isCoverUrl = message.icon === undefined ? undefined : message.icon.startsWith('http')
            sdkNotifications.info(message.content, {
                durationMs: message.durationMs,
                icon: message.icon && !isCoverUrl ? message.icon as any : undefined,
                coverUrl: isCoverUrl ? message.icon : undefined,
            })
        }
        else {
            (notification.type === "alert" ? modals.alert : modals.confirm)({
                message: message.content,
                title: message.title ?? addonConfig.name,
                confirmLabel: message.buttons?.length ? message.buttons[0].label : undefined,
                cancelLabel: (message.buttons?.length ?? 0) >= 2 && Array.isArray(message.buttons) && message.buttons[1].label ? message.buttons[1].label : undefined
            }).then((confirm) => {
                if (notification.once === false) saveHandleNotification(notification)
                
                if (!message.buttons?.length) return;

                if (confirm && message.buttons[0].href) {
                    openExternalLink(message.buttons[0].href)
                }
                else if (!confirm && message.buttons.length >= 2 && message.buttons[1].href) {
                    openExternalLink(message.buttons[1].href)
                }
            })
        }

        if (notification.type === "notification" || notification.once !== false) {
            saveHandleNotification(notification)
        }
    }
}

const getStorageHandleKey = (notification: Notification) => `notification-handled:${notification.id}`

function isNotificationHandled(notification: Notification) {
    return localStorage.getItem(getStorageHandleKey(notification))
}

function saveHandleNotification(notification: Notification) {
    localStorage.setItem(getStorageHandleKey(notification), "true")
}