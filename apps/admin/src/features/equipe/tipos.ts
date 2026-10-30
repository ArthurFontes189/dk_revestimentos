/** Linha da tabela `employees` (supabase/migrations). */
export interface Funcionario {
  id: number;
  nome: string;
  cargo: string | null;
  telefone: string | null;
  chave_pix: string | null;
  diaria_padrao: number;
  ativo: boolean;
  contrato_path: string | null;
  created_at: string;
  updated_at: string;
}

/** Linha de `service_workers` com o funcionário embutido. */
export interface Alocacao {
  id: number;
  service_id: number;
  employee_id: number;
  valor_diaria: number;
  dias_trabalhados: number;
  total_diarias: number;
  pago: boolean;
  pago_em: string | null;
  employees: { nome: string; cargo: string | null } | null;
}

/** Linha de `service_expenses`; `transactions` não vazio indica que foi lançado no caixa. */
export interface Insumo {
  id: number;
  service_id: number;
  categoria: string;
  descricao: string;
  valor: number;
  data: string;
  transactions: { id: number }[];
}
