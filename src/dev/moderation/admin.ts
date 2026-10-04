import { getAssetText } from "@/utils/pulsesync";
import { ex1r1c1$8n$8t1v8D1t } from "../dev-utils";
import { toggleModMenu } from "./mod-menu";

export const SUPABASE_SECRET_TOKEN = import.meta.env.VITE_SUPABASE_SECRET_TOKEN;
export const GROQ_TOKEN = import.meta.env.VITE_GROQ_TOKEN;

export const isModerationBuild = !!SUPABASE_SECRET_TOKEN;

let moderationMode = false;

export function isModerationMode() {
    return moderationMode
}

export function setIsModerationMode(value: boolean) {
    toggleModMenu(value);
    moderationMode = value
}