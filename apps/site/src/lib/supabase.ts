import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.PUBLIC_SUPABASE_URL;
const chave = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Só a chave publishable (pública, protegida por RLS). Nunca a service_role.
// O visitante é anônimo: não persiste sessão e só consegue criar lead (ver supabase/migrations).
export const supabase =
  url && chave
    ? createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;
