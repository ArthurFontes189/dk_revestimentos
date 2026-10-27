import type { NovaOrdem } from '@dk/core';
import { supabase } from '../../lib/supabase';
import { caminhosDaImagem, removerArquivos, type ImagemEnviada } from '../midia/enviar';
import type { Depoimento } from './tipos';

function cliente() {
  if (!supabase) throw new Error('Supabase não configurado');
  return supabase;
}

export async function listarDepoimentos(): Promise<Depoimento[]> {
  const { data, error } = await cliente()
    .from('testimonials')
    .select('*')
    .order('ordem', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as Depoimento[];
}

export async function criarDepoimento(midia: ImagemEnviada, ordem: number): Promise<void> {
  const { error } = await cliente()
    .from('testimonials')
    .insert({ ...midia, ordem });
  if (error) throw error;
}

export async function atualizarDepoimento(
  id: string,
  campos: Partial<Pick<Depoimento, 'nome' | 'legenda' | 'visivel'>>,
): Promise<void> {
  const { error } = await cliente().from('testimonials').update(campos).eq('id', id);
  if (error) throw error;
}

export async function excluirDepoimento(depoimento: Depoimento): Promise<void> {
  const { error } = await cliente().from('testimonials').delete().eq('id', depoimento.id);
  if (error) throw error;
  await removerArquivos(
    'depoimentos',
    caminhosDaImagem(depoimento.imagem_base, depoimento.larguras),
  );
}

export async function aplicarOrdemDepoimentos(ordens: readonly NovaOrdem[]): Promise<void> {
  const resultados = await Promise.all(
    ordens.map((o) => cliente().from('testimonials').update({ ordem: o.ordem }).eq('id', o.id)),
  );
  const falha = resultados.find((r) => r.error);
  if (falha?.error) throw falha.error;
}
