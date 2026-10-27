import type { DadosItemPortfolio, NovaOrdem } from '@dk/core';
import { supabase } from '../../lib/supabase';
import { caminhosDaImagem, removerArquivos, type ImagemEnviada } from '../midia/enviar';
import type { ItemPortfolio } from './tipos';

function cliente() {
  if (!supabase) throw new Error('Supabase não configurado');
  return supabase;
}

export async function listarPortfolio(): Promise<ItemPortfolio[]> {
  const { data, error } = await cliente()
    .from('portfolio_items')
    .select('*')
    .order('ordem', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as ItemPortfolio[];
}

export interface NovoItem extends DadosItemPortfolio {
  tipo: 'foto' | 'video';
  midia: ImagemEnviada & { video_path?: string };
  ordem: number;
}

export async function criarItem({ midia, ...resto }: NovoItem): Promise<void> {
  const { error } = await cliente()
    .from('portfolio_items')
    .insert({ ...resto, ...midia, video_path: midia.video_path ?? null });
  if (error) throw error;
}

export async function atualizarItem(
  id: string,
  campos: Partial<
    Pick<ItemPortfolio, 'titulo' | 'descricao' | 'categoria' | 'destaque' | 'publicado'>
  >,
): Promise<void> {
  const { error } = await cliente().from('portfolio_items').update(campos).eq('id', id);
  if (error) throw error;
}

/** Apaga a linha e, depois, os arquivos do Storage (se esta parte falhar, só sobram arquivos órfãos). */
export async function excluirItem(item: ItemPortfolio): Promise<void> {
  const { error } = await cliente().from('portfolio_items').delete().eq('id', item.id);
  if (error) throw error;
  const caminhos = caminhosDaImagem(item.imagem_base, item.larguras);
  if (item.video_path) caminhos.push(item.video_path);
  await removerArquivos('portfolio', caminhos);
}

export async function aplicarOrdem(ordens: readonly NovaOrdem[]): Promise<void> {
  const resultados = await Promise.all(
    ordens.map((o) => cliente().from('portfolio_items').update({ ordem: o.ordem }).eq('id', o.id)),
  );
  const falha = resultados.find((r) => r.error);
  if (falha?.error) throw falha.error;
}
