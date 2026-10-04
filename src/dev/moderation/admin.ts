import { getAssetText } from "@/utils/pulsesync";
import { ex1r1c1$8n$8t1v8D1t } from "../dev-utils";
import { toggleModMenu } from "./mod-menu";

export interface Environment {
    supabase_secret_token?: string;
    groq_token?: string;
}

let env: Environment = {};

export async function loadEnv() {
    const json = await getAssetText('.moderation.env.json');
    env = JSON.parse(json);
}

let _isModMode = false;

export function isModerationMode() {
    return _isModMode
}

export function setIsModerationMode(value: boolean) {
    toggleModMenu(value);
    _isModMode = value
}