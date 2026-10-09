import { net } from '@pulsesync/addon-sdk'

import { SECRET_SUPABASE_TOKEN } from '@/../build-info'

const BASE_URL = 'https://pzomqvgckpgkshxhpite.supabase.co/rest/v1'

function request(table: string, query: string) {
    if (!SECRET_SUPABASE_TOKEN) throw new Error('SECRET_SUPABASE_TOKEN is not defined')

    return net.fetch(`${BASE_URL}/${table}?${query}`, {
        headers: {
            apiKey: SECRET_SUPABASE_TOKEN,
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SECRET_SUPABASE_TOKEN}`,
        },
    })
}

export interface Report {
    id: string
    created_at: string
    track_id: number
    replaced: boolean
    type: string
}

export async function getReports(): Promise<Report[]> {
    const response = await request('reported_tracks', 'select=*&limit=10000')
    if (!response.ok) {
        throw new Error(`Failed to fetch reports: ${response.status} ${response.statusText}`)
    }

    const json = (await response.json()) as Report[]
    return json
}
