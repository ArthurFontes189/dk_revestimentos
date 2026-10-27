/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_WHATSAPP_NUMBER?: string;
  readonly PUBLIC_META_PIXEL_ID?: string;
  /** "true" liga a indexação pelo Google (produção). Qualquer outro valor mantém noindex. */
  readonly PUBLIC_INDEXAR?: string;
  readonly PUBLIC_SUPABASE_URL?: string;
  readonly PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
