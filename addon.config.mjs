import { IS_DEVELOPMENT_BUILD, SECRET_GROQ_TOKEN } from "./build-info.js";
 
const addonConfig = {
    id: 'fckcensor',
    directoryName: 'fckcensor',
    name: 'FckCensor [v2.0.0-beta.1]',
    description: 'Автоматически убирает цензуру и позволяет делать это вручную.',
    version: '2.0.90',
    author: 'Hazzz895',
    type: 'script',
    image: 'image.png',
    banner: 'banner.png',
    libraryLogo: '',
    tags: ["Info", "Script", "Tools"],
    dependencies: [],
    allowedUrls: [
        "https://github.com/",
        "https://raw.githubusercontent.com/",
        "https://pzomqvgckpgkshxhpite.supabase.co/",
        "https://t2.genius.com/unsafe/",
        "https://genius.com/",
    ], 
    supportedVersions: [],
}

if (SECRET_GROQ_TOKEN) {
    addonConfig.allowedUrls.push("https://api.groq.com/openai/v1");
}

if (IS_DEVELOPMENT_BUILD) {
    addonConfig.name = "[DEV] " + addonConfig.name 
}

export default addonConfig
