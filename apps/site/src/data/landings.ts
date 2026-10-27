import type { CategoriaPortfolio, TipoServico } from '@dk/core';

/**
 * Páginas de destino para anúncios. Cada uma mostra só trabalhos reais da categoria e pré-seleciona
 * o serviço no formulário. Ficam com `noindex` (não competem com a home no Google).
 */
export interface Landing {
  slug: string;
  titulo: string;
  subtitulo: string;
  descricao: string;
  servico: TipoServico;
  categoria: CategoriaPortfolio;
  pontos: readonly string[];
}

const PONTOS_PADRAO = [
  'Projeto desenhado para o seu espaço',
  'Produção na oficina e montagem no local',
  'Orçamento pelo WhatsApp em poucos passos',
] as const;

export const LANDINGS: readonly Landing[] = [
  {
    slug: 'decks-e-areas-externas',
    titulo: 'Decks e áreas externas em madeira sob medida',
    subtitulo:
      'Projetamos e montamos decks, bancos e áreas de convivência para o seu espaço ao ar livre.',
    descricao:
      'Decks e áreas externas em madeira sob medida. Veja trabalhos reais e peça seu orçamento pelo WhatsApp.',
    servico: 'Ambientes Externos',
    categoria: 'ÁREAS EXTERNAS',
    pontos: PONTOS_PADRAO,
  },
  {
    slug: 'moveis-sob-medida',
    titulo: 'Móveis de madeira sob medida',
    subtitulo: 'Mesas, bancos, sofás e peças exclusivas feitas para o seu ambiente.',
    descricao:
      'Móveis de madeira sob medida: mesas, bancos, sofás e peças exclusivas. Veja trabalhos reais e peça seu orçamento.',
    servico: 'Marcenaria Sob Medida',
    categoria: 'MÓVEIS SOB MEDIDA',
    pontos: PONTOS_PADRAO,
  },
  {
    slug: 'marcenaria-sob-medida',
    titulo: 'Marcenaria sob medida para os detalhes que fazem diferença',
    subtitulo: 'Estantes, nichos, poltronas e peças especiais, produzidos sob medida para você.',
    descricao:
      'Marcenaria sob medida: estantes, nichos, poltronas e peças especiais. Veja trabalhos reais e peça seu orçamento.',
    servico: 'Marcenaria Sob Medida',
    categoria: 'MARCENARIA',
    pontos: PONTOS_PADRAO,
  },
];
