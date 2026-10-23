import { IS_DEVELOPMENT_BUILD, SECRET_GROQ_TOKEN } from "./build-info.js"

const addonConfig = {
    id: 'dbcc49253774bd2d29f760e1',
    directoryName: 'fckcensor',
    name: 'FckCensor',
    description: 'Автоматически убирает цензуру и позволяет делать это вручную.',
    version: '2.0.0',
    author: [
        'Hazzz895',
        'forea.adoxid'
    ],
    type: 'script',
    requirements: {
        minHostApi: 1,
        capabilities: ['native-ui-v2', 'resource-read-v1', 'resource-hooks-v1', 'metadata-overrides-v1', 'library-overrides-v1'],
    },
    image: 'image.png',
    banner: 'banner.png',
    libraryLogo: '',
    tags: ['Info', 'Script', 'Tools'],
    allowedUrls: [
        'https://github.com/',
        'https://raw.githubusercontent.com/',
        'https://pzomqvgckpgkshxhpite.supabase.co/',
        'https://t2.genius.com/unsafe/',
        'https://genius.com/',
        'https://lrclib.net/',
    ],
    storeAddonId: '78d083c5-0510-4c41-b3de-41aab30a9fc5'
}

if (addonConfig.beta) {
    addonConfig.name += ' ['
    addonConfig.name += `${addonConfig.version}-beta`
    if (typeof addonConfig.beta === 'number' && addonConfig.beta > 0) {
        addonConfig.name += `.${addonConfig.beta}`
    }
    addonConfig.name += ']'
}

if (SECRET_GROQ_TOKEN) {
    addonConfig.allowedUrls.push('https://api.groq.com/openai/v1')
}

if (IS_DEVELOPMENT_BUILD) {
    addonConfig.name = '[DEV] ' + addonConfig.name
}

export default addonConfig
