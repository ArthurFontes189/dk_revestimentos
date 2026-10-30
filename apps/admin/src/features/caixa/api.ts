import type { DadosLancamento, FiltroCaixa } from '@dk/core';
import { supabase } from '../../lib/supabase';
import type { LancamentoDoCaixa } from './tipos';

/** Teto do PostgREST: se a consulta chegar nele, o painel avisa que os totais podem estar incompletos. */
export const LIMITE_DE_LANCAMENTOS = 1000;

function cliente() {
  if (!supabase) throw new Error('Supabase não configurado');
  return supabase;
}

export async function listarLancamentos({
  de,
  ate,
  categoria,
}: FiltroCaixa): Promise<LancamentoDoCaixa[]> {
  let consulta = cliente()
    .from('transactions')
    .select('*, services(descricao)')
    .order('data', { ascending: false })
    .order('id', { ascending: false })
    .limit(LIMITE_DE_LANCAMENTOS);
  if (de) consulta = consulta.gte('data', de);
  if (ate) consulta = consulta.lte('data', ate);
  if (categoria) consulta = consulta.eq('categoria', categoria);
  const { data, error } = await consulta;
  if (error) throw error;
  return data as LancamentoDoCaixa[];
}

export async function criarLancamento(dados: DadosLancamento): Promise<void> {
  const { error } = await cliente().from('transactions').insert(dados);
  if (error) throw error;
}

export async function atualizarLancamento(id: number, dados: DadosLancamento): Promise<void> {
  const { error } = await cliente().from('transactions').update(dados).eq('id', id);
  if (error) throw error;
}

export async function excluirLancamento(id: number): Promise<void> {
  const { error } = await cliente().from('transactions').delete().eq('id', id);
  if (error) throw error;
}

export function mensagemDoCaixa(erro: unknown): string {
  const { code, message } = (erro ?? {}) as { code?: string; message?: string };
  if (code === '42501') return 'Este lançamento é automático. Altere pela obra.';
  return message ?? 'Não foi possível concluir. Tente de novo.';
}
