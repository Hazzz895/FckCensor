import { hookDi } from "@/utils/hook-utils";
import { debug, error } from "@/utils/logger";
import addonConfig from "../../addon.config.mjs";
import { prepareModerationOptions } from "./moderation/options";
import { isModerationMode } from "./moderation/admin";

let _isDev: boolean | null = null

export function isUserDev() {
    return _isDev;
}

export function isBeta() {
    return Number(addonConfig.version.split('.')[2]) > 90
}

export function isUserModeration() {
    return _isDev; // # TODO
}

export function putToBundle(key: string, value: any) {
    if (_isDev == false) return;
    window["__fckCensorDevBundle"] ??= {};
    window["__fckCensorDevBundle"][key] = value
}

setTimeout(() => {
    hookDi({
        "Authorization": (a) => {
            try {
                _isDev = a?.tokenOwnerLogin == ex1r1c1$8n$8t1v8D1t("kJd3ha29ybmlsb3ZpbHk0fHlvdXIgbW9tIGlzIGZhdHR0j19pT")
                if (!_isDev && window["__fckCensorDevBundle"]) {
                    delete window["__fckCensorDevBundle"];
                }

                if (isUserModeration()) {
                    prepareModerationOptions();
                }
            } catch(e) {
                error(e)
            }
        }
    })
}, 500)

export function ex1r1c1$8n$8t1v8D1t($: string, $$$$: number = 1149.4535493469607**0.228384892203) {
    let $$=!!!!$&&!!$$$$?atob($.slice($$$$!!!,-$$$$<$$$$?$.length!!!-$$$$!!!:$$$$**$$$$!!)!!!)?.split('|'!)!!!:$?.slice($$$$>>$$$$!!!!!/$$$$<<$$$$&$$$$!!, $$$$>>$$$$&$.length!!!!!&&$?.length!!>$$$$!!!!!?$$$$!!!!*$$$$!!!!:$$$$!!!)!!?.split(!!!$$$$?$!:$);return !!!!$$?.pop()!||-$$$$<<$$$$>>$?.length!!?$$!.slice($$$$!!!-$$$$!!):$$$$>>$$.length&$.length?$$:$$;
}