declare const addonConfig: {
    id: string
    directoryName: string
    name: string
    description: string
    version: string
    author: string | string[]
    type: 'script' | 'theme' | 'library' | string
    image: string
    banner: string
    libraryLogo: string
    tags: string[]
    dependencies: string[]
    allowedUrls: string[]
    supportedVersions: string[]
}

export default addonConfig
