import { findModule } from "@/utils/hook-utils";
import { debug, warn } from "@/utils/logger";

let _notificationComponentsCache: { notificationManager: any; React: any; NotificationComponent: any; Typography: any; PaperComponent: any; styles: any; } | null = null;
function getNotificationComponents() {
    if (_notificationComponentsCache) return _notificationComponentsCache;

    const notificationManager = findModule("Notification", "notification", "dismiss")
    const React = findModule("createElement", "cacheSignal", "createContext", "createRef", "forwardRef")
    const NotificationComponent = findModule("$W", "NX", "fJ", "cp", "hT", "OM", "DZ")
    const Typography = findModule("Caption", "Heading")
    const PaperComponent = findModule("Paper")?.Paper
    const styles = findModule("message", "cover", "image", "text")

    _notificationComponentsCache = {
        notificationManager: notificationManager,
        React: React,
        NotificationComponent: NotificationComponent,
        Typography: Typography,
        PaperComponent: PaperComponent,
        styles: styles
    }

    debug(_notificationComponentsCache);
    if (Object.values(_notificationComponentsCache).some(v => !v)) {
        warn("Failed to find notification components", _notificationComponentsCache)
        return _notificationComponentsCache = null;;
    }

    return _notificationComponentsCache;
}

function postNotification(caption: string, image: string | null = null) {
    debug("Posting notification", caption, image);
    getNotificationComponents();
    if (!_notificationComponentsCache) {
        return;
    }
    const { notificationManager, React, NotificationComponent, Typography, PaperComponent, styles } = _notificationComponentsCache;
    const children = [];

    if (image) {
        const img = React.createElement(NotificationComponent.BW, {
        className: styles.image,
        src: image,
        alt: "cover",
        size: 100,
        fit: "cover",
        withAvatarReplace: true
        });

        const paper = React.createElement(PaperComponent, {
        className: styles.cover,
        radius: "s",
        }, img);

        children.push(paper);
    }

    const text = React.createElement(Typography.Caption, {
        className: styles.text,
        variant: "div",
        type: "controls",
        size: "m",
        "aria-hidden": true
    }, caption);

    children.push(text);

    const content = React.createElement("div", {
        className: styles.message
    }, ...children);

    const ctr = React.createElement(NotificationComponent.$W, { 
        message: content 
    });

    notificationManager.notification({
        message: ctr,
        options: { autoClose: 5e3, closeOnClick: true, pauseOnHover: true, draggable: false, single: true, containerId: "INFO"},
    });
}

export default postNotification;