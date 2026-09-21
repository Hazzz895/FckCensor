import { ex1r1c1$8n$8t1v8D1t } from "@/dev/dev-utils"
import { SpoofableType } from "@/types"
import { debug } from "@/utils/logger"
import { localSource } from "./db-api"
import { localizeSpoofableType } from "@/utils/common"

const BASE_URI = "https://pzomqvgckpgkshxhpite.supabase.co/rest/v1/"
const [API_KEY] = ex1r1c1$8n$8t1v8D1t("nkrikZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW5CNmIyMXhkbWRqYTNCbmEzTm9lR2h3YVhSbElpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTnpVd05UZ3pOREVzSW1WNGNDSTZNakE1TURZek5ETTBNWDAuZ2dDeE0tdmVyM2dEV1VCV3loU0JmeTNuN3JwZFc4anRseFJRVkNYa2hOZ3x5b3VyIG1vbSBpcyBmYXR0o6O55")

const REPORTED_TRACKS = "reported_tracks"

async function post(table: string, body: any) {
    return await fetch(`${BASE_URI}${table}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": API_KEY,
                "Authorization": `Bearer ${API_KEY}`,
            },
            body: JSON.stringify(body)
        })
}

export async function report(id: TrackId, type: SpoofableType, replaced: boolean): Promise<boolean> {
    const numId = Number(id);

    if (isNaN(numId) || localSource.isReported(numId, type)) return false;

    const body = {
        track_id: numId,
        type,
        replaced,
    }

    const request = await post(REPORTED_TRACKS, body);

    if (!replaced && !request.ok) {
        window.pulsesyncApi?.showNotification?.("Не удалось сообщить о цензуре.", "error", {});
        return false;
    }
    else if (!replaced && request.ok) {
        window.pulsesyncApi?.showNotification?.("Спасибо! В скором времени этот " + localizeSpoofableType(type) + " будет добавлен в список автоматически подменяемых.", "info", {})
        localSource.pushReported(numId, type);
        return true;
    }

    return false;
}