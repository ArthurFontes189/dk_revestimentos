import type { StatusLead, TipoServico } from '@dk/core';

/** Linha da tabela `leads` (supabase/migrations). */
export interface Lead {
  id: number;
  nome: string;
  telefone: string;
  bairro: string | null;
  tipo_servico: TipoServico;
  mensagem: string | null;
  status: StatusLead;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  fbclid: string | null;
  pagina_entrada: string | null;
  created_at: string;
  updated_at: string;
}
