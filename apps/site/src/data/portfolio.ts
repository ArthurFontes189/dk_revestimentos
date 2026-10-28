import type { CategoriaPortfolio } from '@dk/core';
import type { ImageMetadata } from 'astro';

import bistroMesaAlta from '../assets/portfolio/bistro-mesa-alta.jpg';
import capaDeckAgua from '../assets/portfolio/capa-deck-agua.jpg';
import capaDeckCurvoLago from '../assets/portfolio/capa-deck-curvo-lago.jpg';
import capaDeckLajeEscada from '../assets/portfolio/capa-deck-laje-escada.jpg';
import capaEscrivaninha from '../assets/portfolio/capa-escrivaninha.jpg';
import capaPortaoRipado from '../assets/portfolio/capa-portao-ripado.jpg';
import daybedTrancado from '../assets/portfolio/daybed-trancado.jpg';
import deckLago from '../assets/portfolio/deck-lago.jpg';
import deckPiscina from '../assets/portfolio/deck-piscina.jpg';
import estanteEscada from '../assets/portfolio/estante-escada.jpg';
import mesaBordaNatural from '../assets/portfolio/mesa-borda-natural.jpg';
import mesasEBancos from '../assets/portfolio/mesas-e-bancos.jpg';
import oratorioRipado from '../assets/portfolio/oratorio-ripado.jpg';
import poltronaTrancada from '../assets/portfolio/poltrona-trancada.jpg';
import inicial from './portfolio-inicial.json';

/**
 * Portfólio INICIAL, embutido no site: serve de reserva quando o banco está vazio ou indisponível no
 * momento da publicação, e é a origem do script de importação (scripts/importar-portfolio.mjs).
 * Os metadados ficam em portfolio-inicial.json; aqui só se ligam os nomes às imagens.
 */
export interface ItemPortfolio {
  id: string;
  titulo: string;
  /** Também serve de texto alternativo da imagem. */
  descricao: string;
  categoria: CategoriaPortfolio;
  tipo: 'foto' | 'video';
  /** Foto, ou capa do vídeo. */
  imagem: ImageMetadata;
  /** Caminho do vídeo dentro de /public (só para tipo "video"). */
  video?: string;
}

const IMAGENS: Record<string, ImageMetadata> = {
  'bistro-mesa-alta': bistroMesaAlta,
  'capa-deck-agua': capaDeckAgua,
  'capa-deck-curvo-lago': capaDeckCurvoLago,
  'capa-deck-laje-escada': capaDeckLajeEscada,
  'capa-escrivaninha': capaEscrivaninha,
  'capa-portao-ripado': capaPortaoRipado,
  'daybed-trancado': daybedTrancado,
  'deck-lago': deckLago,
  'deck-piscina': deckPiscina,
  'estante-escada': estanteEscada,
  'mesa-borda-natural': mesaBordaNatural,
  'mesas-e-bancos': mesasEBancos,
  'oratorio-ripado': oratorioRipado,
  'poltrona-trancada': poltronaTrancada,
};

export const PORTFOLIO: readonly ItemPortfolio[] = inicial.map((item) => {
  const imagem = IMAGENS[item.imagem];
  if (!imagem) throw new Error(`Imagem "${item.imagem}" não encontrada em portfolio.ts`);
  return {
    id: item.id,
    titulo: item.titulo,
    descricao: item.descricao,
    categoria: item.categoria as CategoriaPortfolio,
    tipo: item.tipo as 'foto' | 'video',
    imagem,
    ...('video' in item && item.video ? { video: `portfolio/${item.video}.mp4` } : {}),
  };
});

export const CATEGORIAS: readonly { valor: CategoriaPortfolio; id: string; rotulo: string }[] = [
  { valor: 'ÁREAS EXTERNAS', id: 'areas-externas', rotulo: 'Áreas externas' },
  { valor: 'MÓVEIS SOB MEDIDA', id: 'moveis-sob-medida', rotulo: 'Móveis sob medida' },
  { valor: 'MARCENARIA', id: 'marcenaria', rotulo: 'Marcenaria' },
  {
    valor: 'MADEIRA & REVESTIMENTOS',
    id: 'madeira-revestimentos',
    rotulo: 'Madeira e revestimentos',
  },
  { valor: 'PROJETOS ESPECIAIS', id: 'projetos-especiais', rotulo: 'Projetos especiais' },
];

/** Categorias que têm ao menos um item (as vazias não viram filtro). */
export function categoriasComItens(itens: readonly { categoria: CategoriaPortfolio }[]) {
  return CATEGORIAS.filter((c) => itens.some((item) => item.categoria === c.valor));
}

export function idDaCategoria(valor: CategoriaPortfolio): string {
  return CATEGORIAS.find((c) => c.valor === valor)?.id ?? 'outros';
}
