import type { CategoriaPortfolio } from '@dk/core';
import { imagemDoBanco, ordenarPortfolio, urlPublica, type ImagemDoBanco } from '@dk/media';
import type { ImageMetadata } from 'astro';
import { PORTFOLIO } from '../data/portfolio';
import { buscarLinhas, urlDoProjeto } from './banco';
import { url } from './urls';

export type ImagemExibida =
  { origem: 'astro'; metadata: ImageMetadata } | ({ origem: 'banco' } & ImagemDoBanco);

/** Item pronto para desenhar, venha do banco ou da reserva embutida. */
export interface ItemExibido {
  id: string;
  titulo: string;
  descricao: string;
  categoria: CategoriaPortfolio;
  tipo: 'foto' | 'video';
  imagem: ImagemExibida;
  /** Endereço do vídeo (só para tipo "video"). */
  video?: string;
}

interface LinhaPortfolio {
  id: string;
  titulo: string;
  descricao: string;
  categoria: CategoriaPortfolio;
  tipo: 'foto' | 'video';
  imagem_base: string;
  larguras: number[];
  largura_original: number;
  altura_original: number;
  blur: string | null;
  video_path: string | null;
  destaque: boolean;
  ordem: number;
}

function daReserva(): ItemExibido[] {
  return PORTFOLIO.map((item) => ({
    id: item.id,
    titulo: item.titulo,
    descricao: item.descricao,
    categoria: item.categoria,
    tipo: item.tipo,
    imagem: { origem: 'astro', metadata: item.imagem },
    ...(item.video ? { video: url(item.video) } : {}),
  }));
}

function doBanco(linha: LinhaPortfolio): ItemExibido {
  return {
    id: linha.id,
    titulo: linha.titulo,
    descricao: linha.descricao,
    categoria: linha.categoria,
    tipo: linha.tipo,
    imagem: { origem: 'banco', ...imagemDoBanco(urlDoProjeto, 'portfolio', linha) },
    ...(linha.video_path ? { video: urlPublica(urlDoProjeto, 'portfolio', linha.video_path) } : {}),
  };
}

let cache: Promise<ItemExibido[]> | null = null;

/**
 * Portfólio da publicação: itens publicados do banco (destaques primeiro, depois a ordem do admin).
 * Se o banco falhar ou estiver vazio, usa o portfólio inicial embutido. Lido uma vez por build.
 */
export function carregarPortfolio(): Promise<ItemExibido[]> {
  cache ??= (async () => {
    const linhas = await buscarLinhas<LinhaPortfolio>(
      'portfolio_items',
      'select=*&publicado=eq.true&order=ordem.asc,created_at.asc',
    );
    if (linhas && linhas.length > 0) return ordenarPortfolio(linhas).map(doBanco);
    return daReserva();
  })();
  return cache;
}
