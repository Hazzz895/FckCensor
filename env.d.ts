interface ImportMetaEnv {
    readonly VITE_SUPABASE_SECRET_TOKEN?: string
    readonly VITE_GROQ_TOKEN?: string
    readonly VITE_USE_CUSTOM_TRACKS?: 'true' | 'false'
    readonly MODE: 'development' | 'production'
    readonly DEV: false
    readonly PROD: true
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
