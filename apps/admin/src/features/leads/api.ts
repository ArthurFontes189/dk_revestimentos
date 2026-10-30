import type { DadosObraDaConversao, StatusLead } from '@dk/core';
import { supabase } from '../../lib/supabase';
import type { Lead } from './tipos';

function cliente() {
  if (!supabase) throw new Error('Supabase não configurado');
  return supabase;
}

export async function listarLeads(): Promise<Lead[]> {
  const { data, error } = await cliente()
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Lead[];
}

export async function atualizarStatusLead(id: number, status: StatusLead): Promise<void> {
  const { error } = await cliente().from('leads').update({ status }).eq('id', id);
  if (error) throw error;
}

export interface ResultadoConversao {
  cliente_id: number;
  codigo: string;
  cliente_novo: boolean;
  /** Só vem preenchido quando a conversão criou a ficha de obra. */
  obra_id: number | null;
}

/**
 * Cria (ou localiza pelo telefone) o cliente e fecha o lead, tudo numa transação no banco.
 * Com `obra`, cria também a ficha e a entrada no caixa na mesma transação.
 */
export async function converterLead(
  id: number,
  obra: DadosObraDaConversao | null = null,
): Promise<ResultadoConversao> {
  // Sem obra, a chamada fica idêntica à da E5 (o parâmetro tem default no banco).
  const { data, error } = await cliente().rpc(
    'converter_lead',
    obra ? { p_lead_id: id, p_obra: obra } : { p_lead_id: id },
  );
  if (error) throw error;
  const [resultado] = data as ResultadoConversao[];
  if (!resultado) throw new Error('A conversão não devolveu o cliente.');
  return resultado;
}

export async function excluirLead(id: number): Promise<void> {
  const { error } = await cliente().from('leads').delete().eq('id', id);
  if (error) throw error;
}
