import { SUPABASE_SECRET_TOKEN } from "../admin"

const BASE_URL = "https://pzomqvgckpgkshxhpite.supabase.co/rest/v1"

function request(table: string, query: string) {
    if (!SUPABASE_SECRET_TOKEN) throw new Error("SUPABASE_SECRET_TOKEN is not defined");

    return fetch(`${BASE_URL}/${table}?${query}`, {
        headers: {
            "apiKey": SUPABASE_SECRET_TOKEN,
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_SECRET_TOKEN}`
        }
    })
}

export interface Report {
    id: string;
    created_at: string;
    track_id: number;
    replaced: boolean;
    type: string;
}

export async function getReports(): Promise<Report[]> {
    const response = await request("reported_tracks", "select=*&limit=10000");
    if (!response.ok) {
        throw new Error(`Failed to fetch reports: ${response.status} ${response.statusText}`);
    }

    const json = await response.json() as Report[];
    return json;
}