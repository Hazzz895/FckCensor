interface ImportMetaEnv {
  readonly VITE_SUPABASE_SECRET_TOKEN?: string;
  readonly VITE_GROQ_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}