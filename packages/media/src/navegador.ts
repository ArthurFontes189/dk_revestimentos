/**
 * Processamento de mídia que roda NO NAVEGADOR do admin, antes do envio ao Storage:
 * redimensiona, converte para WebP e gera a miniatura borrada. Depende de canvas, então só funciona
 * no navegador (é testado pelo Playwright, não pelo Vitest).
 */
import { alturaProporcional, planejarLarguras } from './planejar';
import type { Retangulo } from './tarja';

const QUALIDADE_WEBP = 0.8;
const LARGURA_DO_BLUR = 24;

export interface Variante {
  largura: number;
  altura: number;
  blob: Blob;
}

export interface ImagemOtimizada {
  larguraOriginal: number;
  alturaOriginal: number;
  variantes: Variante[];
  /** Miniatura minúscula (data URL) para usar de placeholder enquanto a imagem carrega. */
  blur: string;
}

function criarCanvas(largura: number, altura: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  return canvas;
}

function contexto(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Seu navegador não conseguiu preparar a imagem.');
  ctx.imageSmoothingQuality = 'high';
  return ctx;
}

function canvasParaBlob(
  canvas: HTMLCanvasElement,
  tipo: string,
  qualidade?: number,
): Promise<Blob> {
  return new Promise((resolver, rejeitar) => {
    canvas.toBlob(
      (blob) => (blob ? resolver(blob) : rejeitar(new Error('Não foi possível gerar a imagem.'))),
      tipo,
      qualidade,
    );
  });
}

/** Redimensiona para as larguras planejadas e converte para WebP (sem ampliar a imagem). */
export async function otimizarImagem(origem: Blob): Promise<ImagemOtimizada> {
  const bitmap = await createImageBitmap(origem);
  try {
    const larguraOriginal = bitmap.width;
    const alturaOriginal = bitmap.height;
    const variantes: Variante[] = [];

    for (const largura of planejarLarguras(larguraOriginal)) {
      const altura = alturaProporcional(larguraOriginal, alturaOriginal, largura);
      const canvas = criarCanvas(largura, altura);
      contexto(canvas).drawImage(bitmap, 0, 0, largura, altura);
      const blob = await canvasParaBlob(canvas, 'image/webp', QUALIDADE_WEBP);
      // Alguns navegadores (ex.: Safari) não geram WebP e devolvem PNG: avisamos em vez de enviar errado.
      if (blob.type !== 'image/webp') {
        throw new Error(
          'Este navegador não gera imagens WebP. Use o Chrome, o Edge ou o Firefox para enviar fotos.',
        );
      }
      variantes.push({ largura, altura, blob });
    }

    const alturaDoBlur = Math.max(
      1,
      alturaProporcional(larguraOriginal, alturaOriginal, LARGURA_DO_BLUR),
    );
    const miniatura = criarCanvas(LARGURA_DO_BLUR, alturaDoBlur);
    contexto(miniatura).drawImage(bitmap, 0, 0, LARGURA_DO_BLUR, alturaDoBlur);
    const blur = miniatura.toDataURL('image/webp', 0.4);

    return { larguraOriginal, alturaOriginal, variantes, blur };
  } finally {
    bitmap.close();
  }
}

/** Pinta de preto, NOS PIXELS da imagem, as áreas escolhidas (frações). Quem vê o arquivo não recupera o que havia. */
export async function aplicarTarjas(origem: Blob, tarjas: readonly Retangulo[]): Promise<Blob> {
  if (tarjas.length === 0) return origem;
  const bitmap = await createImageBitmap(origem);
  try {
    const canvas = criarCanvas(bitmap.width, bitmap.height);
    const ctx = contexto(canvas);
    ctx.drawImage(bitmap, 0, 0);
    ctx.fillStyle = '#000';
    for (const t of tarjas) {
      ctx.fillRect(
        t.x * bitmap.width,
        t.y * bitmap.height,
        t.largura * bitmap.width,
        t.altura * bitmap.height,
      );
    }
    // PNG (sem perdas): a compressão final para WebP acontece depois, em otimizarImagem.
    return await canvasParaBlob(canvas, 'image/png');
  } finally {
    bitmap.close();
  }
}

/** Captura um quadro do início do vídeo para servir de capa (poster). */
export async function capturarQuadroDoVideo(arquivo: Blob): Promise<Blob> {
  const url = URL.createObjectURL(arquivo);
  try {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = url;

    await new Promise<void>((resolver, rejeitar) => {
      video.onloadeddata = () => resolver();
      video.onerror = () =>
        rejeitar(new Error('Não foi possível ler o vídeo. Confira se é um MP4 válido.'));
    });
    await new Promise<void>((resolver) => {
      video.onseeked = () => resolver();
      video.currentTime = Math.min(0.1, (video.duration || 0.2) / 2);
    });

    const canvas = criarCanvas(video.videoWidth, video.videoHeight);
    contexto(canvas).drawImage(video, 0, 0);
    return await canvasParaBlob(canvas, 'image/jpeg', 0.9);
  } finally {
    URL.revokeObjectURL(url);
  }
}
