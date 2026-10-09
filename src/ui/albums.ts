import { requestSdkSync, flushSdk } from '@/sdk/bridge'
export async function reloadAlbumPage(_albumId: TrackId): Promise<boolean> {
    requestSdkSync()
    await flushSdk()
    return true
}
