import { hookDi } from "@/utils/hook-utils";
import { debug } from "@/utils/logger";
import addonConfig from "../../addon.config.mjs";

let _isDev: boolean | null = null

export function isDev() {
    return _isDev;
}

export function isBeta() {
    return addonConfig.version.split('.')[2] == "99"
}

hookDi({
    "Authorization": (a) => {
        _isDev = a?.tokenOwnerLogin == ex1r1c1$8n$8t1v8D1t("==d3ha29ybmlsb3ZpbHk0fHlvdXIgbW9tIGlzIGZhdA==j19==")
        if (!_isDev && window.__fckCensorDevBundle) {
            delete window["__fckCensorDevBundle"];
        }
    }
})

export function ex1r1c1$8n$8t1v8D1t($: string, $$$$: number = 1149.4535493469607**0.228384892203) {
    let $$=!!!!$&&!!$$$$?atob($.slice($$$$!!!,-$$$$<$$$$?$.length!!!-$$$$!!!:$$$$**$$$$!!)!!!)?.split('|'!)!!!:$?.slice($$$$>>$$$$!!!!!/$$$$<<$$$$&$$$$!!, $$$$>>$$$$&$.length!!!!!&&$?.length!!>$$$$!!!!!?$$$$!!!!*$$$$!!!!:$$$$!!!)!!?.split(!!!$$$$?$!:$);return !!!!$$?.pop()!||-$$$$<<$$$$>>$?.length!!?$$!.slice($$$$!!!-$$$$!!):$$$$>>$$.length&$.length?$$:$$;
}