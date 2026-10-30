import type { DadosAlocacao, DadosFuncionario, DadosInsumo } from '@dk/core';
import { supabase } from '../../lib/supabase';
import type { Alocacao, Funcionario, Insumo } from './tipos';

const BUCKET_CONTRATOS = 'contratos';
const VALIDADE_URL_CONTRATO_SEGUNDOS = 60;
const TIPOS_CONTRATO = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const LIMITE_CONTRATO_BYTES = 10 * 1024 * 1024;

function cliente() {
  if (!supabase) throw new Error('Supabase não configurado');
  return supabase;
}

export async function listarFuncionarios(): Promise<Funcionario[]> {
  const { data, error } = await cliente().from('employees').select('*').order('nome');
  if (error) throw error;
  return data as Funcionario[];
}

export async function criarFuncionario(dados: DadosFuncionario): Promise<number> {
  const { data, error } = await cliente().from('employees').insert(dados).select('id').single();
  if (error) throw error;
  return (data as { id: number }).id;
}

export async function atualizarFuncionario(id: number, dados: DadosFuncionario): Promise<void> {
  const { error } = await cliente().from('employees').update(dados).eq('id', id);
  if (error) throw error;
}

export async function excluirFuncionario(funcionario: Funcionario): Promise<void> {
  const { error } = await cliente().from('employees').delete().eq('id', funcionario.id);
  if (error) throw error;
  if (funcionario.contrato_path) await removerContrato(funcionario.contrato_path);
}

/** Valida tipo e tamanho antes de enviar; o bucket também confere no servidor. */
export function validarContrato(arquivo: File): string | null {
  if (!TIPOS_CONTRATO.includes(arquivo.type)) return 'Envie o contrato em PDF, JPG, PNG ou WebP.';
  if (arquivo.size > LIMITE_CONTRATO_BYTES) return 'O contrato passa de 10 MB.';
  return null;
}

/** Envia o contrato e guarda o caminho; o arquivo antigo só sai depois que o novo foi gravado. */
export async function enviarContrato(funcionario: Funcionario, arquivo: File): Promise<void> {
  const extensao =
    arquivo.name
      .split('.')
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, '') ?? 'pdf';
  const caminho = `${funcionario.id}/${crypto.randomUUID()}.${extensao}`;
  const { error: falhaEnvio } = await cliente()
    .storage.from(BUCKET_CONTRATOS)
    .upload(caminho, arquivo, { contentType: arquivo.type });
  if (falhaEnvio) throw falhaEnvio;

  const { error } = await cliente()
    .from('employees')
    .update({ contrato_path: caminho })
    .eq('id', funcionario.id);
  if (error) {
    await removerContrato(caminho);
    throw error;
  }
  if (funcionario.contrato_path) await removerContrato(funcionario.contrato_path);
}

export async function removerContratoDoFuncionario(funcionario: Funcionario): Promise<void> {
  if (!funcionario.contrato_path) return;
  const { error } = await cliente()
    .from('employees')
    .update({ contrato_path: null })
    .eq('id', funcionario.id);
  if (error) throw error;
  await removerContrato(funcionario.contrato_path);
}

async function removerContrato(caminho: string): Promise<void> {
  const { error } = await cliente().storage.from(BUCKET_CONTRATOS).remove([caminho]);
  if (error) throw error;
}

/** URL assinada de curta duração: o contrato nunca fica público. */
export async function urlDoContrato(caminho: string): Promise<string> {
  const { data, error } = await cliente()
    .storage.from(BUCKET_CONTRATOS)
    .createSignedUrl(caminho, VALIDADE_URL_CONTRATO_SEGUNDOS);
  if (error) throw error;
  return data.signedUrl;
}

export async function listarAlocacoes(obraId: number): Promise<Alocacao[]> {
  const { data, error } = await cliente()
    .from('service_workers')
    .select('*, employees(nome, cargo)')
    .eq('service_id', obraId)
    .order('created_at');
  if (error) throw error;
  return data as Alocacao[];
}

export async function alocarFuncionario(obraId: number, dados: DadosAlocacao): Promise<void> {
  const { error } = await cliente()
    .from('service_workers')
    .insert({ ...dados, service_id: obraId });
  if (error) throw error;
}

export async function removerAlocacao(id: number): Promise<void> {
  const { error } = await cliente().from('service_workers').delete().eq('id', id);
  if (error) throw error;
}

/** Pagar lança a saída no caixa; desmarcar remove. Tudo numa transação no banco. */
export async function marcarDiariaPaga(id: number, pago: boolean): Promise<void> {
  const { error } = await cliente().rpc('marcar_diaria_paga', { p_worker_id: id, p_pago: pago });
  if (error) throw error;
}

export async function listarInsumos(obraId: number): Promise<Insumo[]> {
  const { data, error } = await cliente()
    .from('service_expenses')
    .select('*, transactions(id)')
    .eq('service_id', obraId)
    .order('data', { ascending: false });
  if (error) throw error;
  return data as Insumo[];
}

export async function adicionarInsumo(obraId: number, dados: DadosInsumo): Promise<void> {
  const { error } = await cliente().rpc('salvar_insumo', {
    p_obra_id: obraId,
    p_insumo_id: null,
    p_categoria: dados.categoria,
    p_descricao: dados.descricao,
    p_valor: dados.valor,
    p_data: null,
    p_lancar_no_caixa: dados.lancar_no_caixa,
  });
  if (error) throw error;
}

/** O lançamento no caixa sai junto (cascata no banco). */
export async function excluirInsumo(id: number): Promise<void> {
  const { error } = await cliente().from('service_expenses').delete().eq('id', id);
  if (error) throw error;
}

export function mensagemDaEquipe(erro: unknown): string {
  const { code, message } = (erro ?? {}) as { code?: string; message?: string };
  if (code === '23503')
    return 'Este funcionário está alocado em obras. Desative-o em vez de excluir.';
  if (code === '23505') return 'Este funcionário já está nesta obra.';
  return message ?? 'Não foi possível concluir. Tente de novo.';
}
