const env = import.meta.env

export const SECRET_SUPABASE_TOKEN = env?.VITE_SUPABASE_SECRET_TOKEN
export const SECRET_GROQ_TOKEN = env?.VITE_GROQ_TOKEN

export const IS_MODERATION_BUILD = !!SECRET_SUPABASE_TOKEN
export const IS_DEVELOPMENT_BUILD = globalThis?.process?.env ? globalThis.process.env.npm_lifecycle_event === 'dev' : env.MODE === 'development'
