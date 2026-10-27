export const LIMITE_IMAGEM_BYTES = 15 * 1024 * 1024;
export const LIMITE_VIDEO_BYTES = 25 * 1024 * 1024;

const TIPOS_DE_IMAGEM = new Set(['image/jpeg', 'image/png', 'image/webp']);

interface ArquivoBasico {
  type: string;
  size: number;
}

/** Retorna a mensagem de erro para o admin, ou `null` quando a imagem pode ser enviada. */
export function validarImagem(arquivo: ArquivoBasico): string | null {
  if (arquivo.size === 0) return 'O arquivo está vazio.';
  if (!TIPOS_DE_IMAGEM.has(arquivo.type)) {
    return 'Formato não suportado. Envie uma imagem JPEG, PNG ou WebP.';
  }
  if (arquivo.size > LIMITE_IMAGEM_BYTES) return 'A imagem passa de 15 MB. Reduza e tente de novo.';
  return null;
}

/** Retorna a mensagem de erro para o admin, ou `null` quando o vídeo pode ser enviado. */
export function validarVideo(arquivo: ArquivoBasico): string | null {
  if (arquivo.size === 0) return 'O arquivo está vazio.';
  if (arquivo.type !== 'video/mp4') return 'Formato não suportado. Envie um vídeo MP4.';
  if (arquivo.size > LIMITE_VIDEO_BYTES) {
    return 'O vídeo passa de 25 MB. Comprima o arquivo ou use um link do YouTube.';
  }
  return null;
}
