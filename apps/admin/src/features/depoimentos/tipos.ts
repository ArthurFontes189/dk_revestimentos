/** Linha da tabela `testimonials` (supabase/migrations). */
export interface Depoimento {
  id: string;
  imagem_base: string;
  larguras: number[];
  largura_original: number;
  altura_original: number;
  blur: string | null;
  nome: string | null;
  legenda: string | null;
  ordem: number;
  visivel: boolean;
  created_at: string;
  updated_at: string;
}
