import type { ImageMetadata } from 'astro';
import type { CategoriaPortfolio } from '@dk/core';

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

/**
 * Portfólio inicial (E3), com as mídias da v1 e textos novos descritos a partir do que as fotos mostram.
 * Provisório: na E4 estes dados passam a vir do banco, e as mídias, do Storage (editáveis pelo painel).
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

export const PORTFOLIO: readonly ItemPortfolio[] = [
  {
    id: 'deck-lago',
    titulo: 'Deck curvo à beira do lago',
    descricao:
      'Deck com bancos e guarda-corpo em madeira, desenhado em curva acompanhando a margem do lago.',
    categoria: 'ÁREAS EXTERNAS',
    tipo: 'foto',
    imagem: deckLago,
  },
  {
    id: 'mesa-borda-natural',
    titulo: 'Mesa e banco de madeira maciça',
    descricao:
      'Mesa e banco com tampos inteiriços que preservam o contorno natural da madeira e pés vazados em círculo.',
    categoria: 'MÓVEIS SOB MEDIDA',
    tipo: 'foto',
    imagem: mesaBordaNatural,
  },
  {
    id: 'deck-piscina',
    titulo: 'Deck ao lado da piscina',
    descricao: 'Deck de madeira ao longo de uma fachada ripada, junto à piscina e ao jardim.',
    categoria: 'ÁREAS EXTERNAS',
    tipo: 'foto',
    imagem: deckPiscina,
  },
  {
    id: 'daybed-trancado',
    titulo: 'Sofá com encosto trançado',
    descricao:
      'Sofá de madeira com laterais em ripas trançadas, gavetas sob o assento e almofadas.',
    categoria: 'MÓVEIS SOB MEDIDA',
    tipo: 'foto',
    imagem: daybedTrancado,
  },
  {
    id: 'deck-curvo-lago',
    titulo: 'Deck na curva da margem',
    descricao: 'Deck em ripas de madeira acompanhando a curva da margem do lago.',
    categoria: 'ÁREAS EXTERNAS',
    tipo: 'video',
    imagem: capaDeckCurvoLago,
    video: 'portfolio/deck-curvo-lago.mp4',
  },
  {
    id: 'estante-escada',
    titulo: 'Estante em escada',
    descricao: 'Estante de madeira com quatro prateleiras e estrutura inclinada.',
    categoria: 'MARCENARIA',
    tipo: 'foto',
    imagem: estanteEscada,
  },
  {
    id: 'portao-ripado',
    titulo: 'Portão em madeira ripada',
    descricao: 'Folhas de portão em ripas verticais de madeira, com moldura metálica.',
    categoria: 'MADEIRA & REVESTIMENTOS',
    tipo: 'video',
    imagem: capaPortaoRipado,
    video: 'portfolio/portao-ripado.mp4',
  },
  {
    id: 'bistro-mesa-alta',
    titulo: 'Mesa alta com dois bancos',
    descricao: 'Mesa alta e dois bancos com encosto, em madeira, ao lado de um painel ripado.',
    categoria: 'MÓVEIS SOB MEDIDA',
    tipo: 'foto',
    imagem: bistroMesaAlta,
  },
  {
    id: 'deck-laje-escada',
    titulo: 'Deck sobre laje com degraus',
    descricao: 'Deck de madeira com degraus e mureta revestida, executado sobre laje.',
    categoria: 'ÁREAS EXTERNAS',
    tipo: 'video',
    imagem: capaDeckLajeEscada,
    video: 'portfolio/deck-laje-escada.mp4',
  },
  {
    id: 'oratorio-ripado',
    titulo: 'Oratório de parede',
    descricao:
      'Nicho de madeira com porta de vidro e laterais em ripas, fixado em painel de madeira.',
    categoria: 'MARCENARIA',
    tipo: 'foto',
    imagem: oratorioRipado,
  },
  {
    id: 'mesas-e-bancos',
    titulo: 'Mesas e bancos de madeira',
    descricao: 'Mesa longa com dois bancos de madeira maciça e uma mesa redonda, vistas de cima.',
    categoria: 'MÓVEIS SOB MEDIDA',
    tipo: 'foto',
    imagem: mesasEBancos,
  },
  {
    id: 'poltrona-trancada',
    titulo: 'Poltrona com encosto trançado',
    descricao:
      'Poltrona de madeira com laterais em ripas trançadas, fotografada durante o acabamento.',
    categoria: 'MARCENARIA',
    tipo: 'foto',
    imagem: poltronaTrancada,
  },
  {
    id: 'escrivaninha',
    titulo: 'Escrivaninha com gavetas',
    descricao: 'Escrivaninha de madeira com nichos, gavetas e pés inclinados.',
    categoria: 'MÓVEIS SOB MEDIDA',
    tipo: 'video',
    imagem: capaEscrivaninha,
    video: 'portfolio/escrivaninha.mp4',
  },
  {
    id: 'deck-agua',
    titulo: 'Deck junto à água',
    descricao: 'Deck de madeira com acabamento brilhante e recorte curvo à beira da água.',
    categoria: 'ÁREAS EXTERNAS',
    tipo: 'video',
    imagem: capaDeckAgua,
    video: 'portfolio/deck-agua.mp4',
  },
];

/** Categorias que têm ao menos um item (as vazias não viram filtro). */
export function categoriasComItens() {
  return CATEGORIAS.filter((c) => PORTFOLIO.some((item) => item.categoria === c.valor));
}

export function idDaCategoria(valor: CategoriaPortfolio): string {
  return CATEGORIAS.find((c) => c.valor === valor)?.id ?? 'outros';
}
