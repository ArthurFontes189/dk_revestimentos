import type { CategoriaPortfolio } from '@dk/core';

/** Linha da tabela `portfolio_items` (supabase/migrations). */
export interface ItemPortfolio {
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
  publicado: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}
