const env = globalThis?.process?.env ?? import.meta.env

export const SECRET_SUPABASE_TOKEN = env?.VITE_SUPABASE_SECRET_TOKEN
export const SECRET_GROQ_TOKEN = env?.VITE_GROQ_TOKEN
export const USE_CUSTOM_TRACKS = env?.VITE_USE_CUSTOM_TRACKS === 'true'

export const IS_MODERATION_BUILD = !!SECRET_SUPABASE_TOKEN
export const IS_DEVELOPMENT_BUILD = (env.NODE_ENV || env.MODE) === 'development'