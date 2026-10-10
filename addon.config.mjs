const addonConfig = {
    beta: 1,
    id: 'fckcensor',
    directoryName: 'fckcensor',
    name: 'FckCensor',
    description: 'Автоматически убирает цензуру и позволяет делать это вручную.',
    version: '2.0.0',
    author: 'Hazzz895',
    type: 'script',
    requirements: {
        minHostApi: 1,
        capabilities: ['native-ui-v2', 'resource-read-v1', 'resource-hooks-v1', 'metadata-overrides-v1', 'library-overrides-v1'],
    },
    image: 'image.png',
    banner: 'banner.png',
    libraryLogo: '',
    tags: ['Info', 'Script', 'Tools'],
    dependencies: [],
    allowedUrls: [
        'https://github.com/',
        'https://raw.githubusercontent.com/',
        'https://pzomqvgckpgkshxhpite.supabase.co/',
        'https://t2.genius.com/unsafe/',
        'https://genius.com/',
        'https://lrclib.net/',
    ],
    supportedVersions: [],
    conflictsWith: [],
}

if (addonConfig.beta) {
    addonConfig.name += ' ['
    addonConfig.name += `${addonConfig.version}-beta`
    if (typeof addonConfig.beta === 'number' && addonConfig.beta > 0) {
        addonConfig.name += `.${addonConfig.beta}`
    }
    addonConfig.name += ']'

    addonConfig.conflictsWith.push('78d083c5-0510-4c41-b3de-41aab30a9fc5')
}

if (process?.env?.VITE_GROQ_TOKEN) {
    addonConfig.allowedUrls.push('https://api.groq.com/openai/v1')
}

if (process?.env?.NODE_ENV === 'development') {
    addonConfig.name = '[DEV] ' + addonConfig.name
}

export default addonConfig
