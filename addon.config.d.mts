import type { AddonManifest } from '@pulsesync/addon-sdk/vite'

declare const addonConfig: AddonManifest & { storeAddonId: string }
export default addonConfig
