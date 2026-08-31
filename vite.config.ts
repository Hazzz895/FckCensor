import path from 'node:path'
import { promises as fs } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sassDts from 'vite-plugin-sass-dts';
import { defineConfig } from 'vite'
import addonConfig from './addon.config.mjs'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const addonStaticDir = path.resolve(rootDir, 'addon')
const outDir = process.env.PULSESYNC_ADDON_OUT_DIR
    ? path.resolve(process.env.PULSESYNC_ADDON_OUT_DIR)
    : path.resolve(rootDir, 'dist', addonConfig.directoryName)

function sanitizeMetadataValue(value: string | string[] | undefined) {
    if (Array.isArray(value)) {
        return value.map(entry => String(entry).trim()).filter(Boolean)
    }

    return typeof value === 'string' ? value.trim() : ''
}

function createMetadata() {
    return {
        id: addonConfig.id,
        name: addonConfig.name,
        description: addonConfig.description,
        version: addonConfig.version,
        author: sanitizeMetadataValue(addonConfig.author),
        type: addonConfig.type,
        image: addonConfig.image || '',
        banner: addonConfig.banner || '',
        libraryLogo: addonConfig.libraryLogo || '',
        css: 'script.css',
        script: 'script.js',
        tags: Array.isArray(addonConfig.tags) ? addonConfig.tags : [],
        dependencies: Array.isArray(addonConfig.dependencies) ? addonConfig.dependencies : [],
        allowedUrls: Array.isArray(addonConfig.allowedUrls) ? addonConfig.allowedUrls : [],
        supportedVersions: Array.isArray(addonConfig.supportedVersions) ? addonConfig.supportedVersions : [],
    }
}

function packagePulseSyncAddon() {
    return {
        name: 'package-pulsesync-addon',
        async closeBundle() {
            await fs.mkdir(outDir, { recursive: true })
            await fs.cp(addonStaticDir, outDir, { recursive: true, force: true })
            await fs.writeFile(path.join(outDir, 'metadata.json'), JSON.stringify(createMetadata(), null, 4) + '\n', 'utf8')
        },
    }
}

function inlineDebugPlugin() {
  return {
    name: 'inline-debug-transformer',
    transform(code: string, id: string) {
      if (id.includes('node_modules') || id.includes('logger')) return;
      if (code.includes('debug(')) {
        const transformedCode = code.replace(/\bdebug\((.*)\)/g, (match, args) => {
          return `console.debug(...__formatDebugArgs(), ${args})`;
        });
        return {
          code: `import { __formatDebugArgs } from '@/utils/logger';\n` + transformedCode,
          map: null
        };
      }
    }
  };
}


export default defineConfig(({ mode }) => {
    const isDevBuild = mode === 'development'

    return {
        resolve: {
            alias: [
                { find: '@/jsx-runtime', replacement: path.resolve(rootDir, 'src/ui/dom-factory.ts') },
                { find: '@', replacement: path.resolve(rootDir, 'src') },
            ],
        },
        oxc: {
            jsx: {
                runtime: 'automatic',
                importSource: '@',
            },
        },
        build: {
            assetsDir: 'Assets',
            emptyOutDir: false,
            minify: isDevBuild ? false : 'esbuild',
            outDir,
            sourcemap: false,
            target: 'chrome140',
            cssCodeSplit: false,
            lib: {
                entry: path.resolve(rootDir, 'src/main.ts'),
                formats: ['iife'],
                name: 'PulseSyncAddonTemplate',
                fileName: () => 'script.js',
                cssFileName: 'script',
            },
            rollupOptions: {
                output: {
                    assetFileNames: assetInfo => {
                        if (assetInfo.names?.some(name => name.endsWith('.css'))) {
                            return '[name][extname]'
                        }

                        return 'Assets/[name][extname]'
                    },
                },
            },
        },
        plugins: [packagePulseSyncAddon(), inlineDebugPlugin(),
            sassDts({allGenerate: true}),],
    }
})
