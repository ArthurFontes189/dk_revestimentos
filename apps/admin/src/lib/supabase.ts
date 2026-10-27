import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const chave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigurado = Boolean(url && chave);

// Só a chave publishable (pública, protegida por RLS). Nunca a service_role.
// PKCE: o link de recuperação volta com ?code=..., sem conflitar com a rota por hash.
export const supabase =
  url && chave ? createClient(url, chave, { auth: { flowType: 'pkce' } }) : null;
