import type { DadosCliente } from '@dk/core';
import { supabase } from '../../lib/supabase';
import type { Cliente } from './tipos';

function cliente() {
  if (!supabase) throw new Error('Supabase não configurado');
  return supabase;
}

export async function listarClientes(): Promise<Cliente[]> {
  const { data, error } = await cliente()
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Cliente[];
}

export async function criarCliente(dados: DadosCliente): Promise<void> {
  const { error } = await cliente().from('clients').insert(dados);
  if (error) throw error;
}

export async function atualizarCliente(id: number, dados: DadosCliente): Promise<void> {
  const { error } = await cliente().from('clients').update(dados).eq('id', id);
  if (error) throw error;
}

export async function excluirCliente(id: number): Promise<void> {
  const { error } = await cliente().from('clients').delete().eq('id', id);
  if (error) throw error;
}

/** Tradução dos erros do banco que o admin pode causar (telefone ou CPF repetido). */
export function mensagemDoCliente(erro: unknown): string {
  const { code, message } = (erro ?? {}) as { code?: string; message?: string };
  if (code === '23505') {
    if (message?.includes('cpf')) return 'Já existe um cliente com este CPF.';
    if (message?.includes('telefone')) return 'Já existe um cliente com este telefone.';
  }
  return message ?? 'Não foi possível concluir. Tente de novo.';
}
