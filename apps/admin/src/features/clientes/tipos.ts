/** Linha da tabela `clients` (supabase/migrations). */
export interface Cliente {
  id: number;
  codigo: string;
  nome: string;
  telefone: string;
  cpf: string | null;
  endereco: string | null;
  obs: string | null;
  lead_id: number | null;
  created_at: string;
  updated_at: string;
}
