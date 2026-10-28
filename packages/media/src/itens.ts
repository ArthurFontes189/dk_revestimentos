import { maiorVariante, montarSrcset, urlPublica } from './url';
import { caminhoDaVariante } from './url';

export interface ImagemDoBanco {
  /** Menor variante: serve de `src` padrão. */
  src: string;
  srcset: string;
  /** Maior variante (ampliação). */
  grande: string;
  /** Dimensões originais, para o navegador reservar o espaço (sem salto de layout). */
  largura: number;
  altura: number;
  /** Miniatura minúscula usada de placeholder; só aceita data URL de imagem. */
  blur: string | null;
}

interface LinhaComImagem {
  imagem_base: string;
  larguras: readonly number[];
  largura_original: number;
  altura_original: number;
  blur: string | null;
}

/** Converte as colunas de imagem de uma linha do banco nos endereços públicos do Storage. */
export function imagemDoBanco(
  supabaseUrl: string,
  bucket: string,
  linha: LinhaComImagem,
): ImagemDoBanco {
  const menor = Math.min(...linha.larguras);
  return {
    src: urlPublica(supabaseUrl, bucket, caminhoDaVariante(linha.imagem_base, menor)),
    srcset: montarSrcset(supabaseUrl, bucket, linha.imagem_base, linha.larguras),
    grande: maiorVariante(supabaseUrl, bucket, linha.imagem_base, linha.larguras),
    largura: linha.largura_original,
    altura: linha.altura_original,
    // O valor vai para um `style` no HTML: só aceitamos data URL de imagem (nunca outra coisa).
    blur: linha.blur?.startsWith('data:image/') ? linha.blur : null,
  };
}

/** Destaques primeiro; dentro de cada grupo, a ordem definida pelo admin. Não altera a lista original. */
export function ordenarPortfolio<T extends { destaque: boolean; ordem: number }>(
  itens: readonly T[],
): T[] {
  return [...itens].sort((a, b) => Number(b.destaque) - Number(a.destaque) || a.ordem - b.ordem);
}
