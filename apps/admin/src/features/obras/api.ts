import type { DadosObra } from '@dk/core';
import { supabase } from '../../lib/supabase';
import type { Cliente } from '../clientes/tipos';
import type { Obra } from './tipos';

function cliente() {
  if (!supabase) throw new Error('Supabase não configurado');
  return supabase;
}

export async function listarObras(): Promise<Obra[]> {
  const { data, error } = await cliente()
    .from('obras_resumo')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Obra[];
}

/** Só o necessário para escolher o cliente da obra. */
export async function listarClientesParaObra(): Promise<Pick<Cliente, 'id' | 'codigo' | 'nome'>[]> {
  const { data, error } = await cliente().from('clients').select('id, codigo, nome').order('nome');
  if (error) throw error;
  return data as Pick<Cliente, 'id' | 'codigo' | 'nome'>[];
}

/** Cria a obra e, se houver entrada inicial, o lançamento no caixa. */
export async function criarObra(dados: DadosObra, valorEntrada: number): Promise<void> {
  const { data, error } = await cliente().from('services').insert(dados).select('id').single();
  if (error) throw error;
  if (valorEntrada > 0) {
    const { error: falhaEntrada } = await cliente().rpc('definir_recebido', {
      p_obra_id: (data as { id: number }).id,
      p_valor: valorEntrada,
    });
    if (falhaEntrada) throw falhaEntrada;
  }
}

export async function atualizarObra(id: number, dados: DadosObra): Promise<void> {
  const { error } = await cliente().from('services').update(dados).eq('id', id);
  if (error) throw error;
}

export async function mudarStatusObra(id: number, status: Obra['status']): Promise<void> {
  const { error } = await cliente().from('services').update({ status }).eq('id', id);
  if (error) throw error;
}

/** Acrescenta uma entrada no caixa; o banco recusa passar do valor total. */
export async function registrarRecebimento(id: number, valor: number): Promise<void> {
  const { error } = await cliente().rpc('registrar_recebimento', { p_obra_id: id, p_valor: valor });
  if (error) throw error;
}

/** Os lançamentos ligados saem junto (cascata no banco). */
export async function excluirObra(id: number): Promise<void> {
  const { error } = await cliente().from('services').delete().eq('id', id);
  if (error) throw error;
}

export function mensagemDaObra(erro: unknown): string {
  const { message } = (erro ?? {}) as { message?: string };
  return message ?? 'Não foi possível concluir. Tente de novo.';
}
