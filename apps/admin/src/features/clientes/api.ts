import { totaisDoCliente, type DadosCliente, type TotaisCliente } from '@dk/core';
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

/** Contratado e pago por cliente: obras somadas e só as ENTRADAS do caixa. */
export async function listarTotaisPorCliente(): Promise<Map<number, TotaisCliente>> {
  const [obras, caixa] = await Promise.all([
    cliente().from('services').select('client_id, valor_total'),
    cliente().from('transactions').select('client_id, tipo, valor').eq('tipo', 'entrada'),
  ]);
  if (obras.error) throw obras.error;
  if (caixa.error) throw caixa.error;

  const ids = new Set<number>();
  for (const { client_id } of obras.data) ids.add(client_id);
  for (const { client_id } of caixa.data) if (client_id !== null) ids.add(client_id);

  return new Map(
    [...ids].map((id) => [
      id,
      totaisDoCliente(
        obras.data.filter((o) => o.client_id === id),
        caixa.data.filter((t) => t.client_id === id),
      ),
    ]),
  );
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
