import type { TipoTransacao } from '@dk/core';

/** Linha de `transactions` com o nome da obra embutido. */
export interface LancamentoDoCaixa {
  id: number;
  tipo: TipoTransacao;
  categoria: string;
  descricao: string | null;
  valor: number;
  data: string;
  client_id: number | null;
  service_id: number | null;
  worker_id: number | null;
  expense_id: number | null;
  created_at: string;
  services: { descricao: string } | null;
}
