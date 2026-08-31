import { getAssetText } from "@/utils/pulsesync";
import { ex1r1c1$8n$8t1v8D1t } from "../dev-utils";

let SUPABASE_SECRET_TOKEN: string | null = null;

export async function loadEnv() {
    try {
        [SUPABASE_SECRET_TOKEN] = ex1r1c1$8n$8t1v8D1t(await getAssetText('.moderation.env'));
    } catch {}
}