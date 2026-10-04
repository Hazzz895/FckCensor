import { debug } from "@/utils/logger";
import { toggleModMenu } from "./mod-menu";

export const SUPABASE_SECRET_TOKEN = import.meta.env.VITE_SUPABASE_SECRET_TOKEN;
export const GROQ_TOKEN = import.meta.env.VITE_GROQ_TOKEN;

export const isModerationBuild = !!SUPABASE_SECRET_TOKEN;

if (isModerationBuild) {
    import("./options").then(m => m.prepareModerationOptions());
}

let moderationMode = false;

export function isModerationMode() {
    return moderationMode
}

export function setIsModerationMode(value: boolean) {
    toggleModMenu(value);
    moderationMode = value
}