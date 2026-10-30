import type { StatusObra } from '@dk/core';

/** Linha da view `obras_resumo` (supabase/migrations): a obra com o recebido somado do caixa. */
export interface Obra {
  id: number;
  client_id: number;
  lead_id: number | null;
  descricao: string;
  materiais: string | null;
  forma_pagamento: string | null;
  responsavel: string | null;
  data_entrega: string | null;
  valor_total: number;
  status: StatusObra;
  concluida_em: string | null;
  created_at: string;
  updated_at: string;
  valor_recebido: number;
  saldo: number;
}
