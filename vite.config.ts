import path from 'node:path'

import { addonPlugin, defineAddonManifest } from '@pulsesync/addon-sdk/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

import { settings } from './src/settings.ts'

export default defineConfig(async ({ mode }) => {
    Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
    process.env.NODE_ENV = process.env.NODE_ENV || mode
    process.env.MODE = mode
    const { default: addonConfig } = await import('./addon.config.mjs')
    const manifest = defineAddonManifest(addonConfig)

    return {
        resolve: {
            alias: [
                {
                    find: '@/jsx-dev-runtime',
                    replacement: path.resolve(import.meta.dirname, 'src/ui/dom-factory.ts'),
                },
                {
                    find: '@/jsx-runtime',
                    replacement: path.resolve(import.meta.dirname, 'src/ui/dom-factory.ts'),
                },
                {
                    find: '@',
                    replacement: path.resolve(import.meta.dirname, 'src'),
                },
            ],
        },
        plugins: [
            react(),
            addonPlugin({
                manifest,
                settings,
                minify: mode === 'development' ? false : 'oxc',
                ...(process.env.PULSESYNC_ADDON_OUT_DIR ? { outDir: process.env.PULSESYNC_ADDON_OUT_DIR } : {}),
            }),
        ],
    }
})
