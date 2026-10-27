import { caminhoDaVariante, hashDoConteudo, urlPublica } from '@dk/media';
import { capturarQuadroDoVideo, otimizarImagem } from '@dk/media/navegador';
import { supabase } from '../../lib/supabase';

export type Bucket = 'portfolio' | 'depoimentos';

/** 1 ano. Seguro porque o nome do arquivo leva o hash do conteúdo: se muda, o endereço muda. */
const CACHE_LONGO = '31536000';

export interface ImagemEnviada {
  imagem_base: string;
  larguras: number[];
  largura_original: number;
  altura_original: number;
  blur: string;
}

function cliente() {
  if (!supabase) throw new Error('Supabase não configurado');
  return supabase;
}

/** Endereço público de uma variante, para mostrar no painel. */
export function urlDaVariante(bucket: Bucket, base: string, largura: number): string {
  const projeto = import.meta.env.VITE_SUPABASE_URL ?? '';
  return urlPublica(projeto, bucket, caminhoDaVariante(base, largura));
}

export function caminhosDaImagem(base: string, larguras: readonly number[]): string[] {
  return larguras.map((largura) => caminhoDaVariante(base, largura));
}

/** Remove arquivos do Storage. Se falhar, sobram arquivos órfãos, mas o painel segue funcionando. */
export async function removerArquivos(bucket: Bucket, caminhos: readonly string[]): Promise<void> {
  if (caminhos.length === 0) return;
  await cliente()
    .storage.from(bucket)
    .remove([...caminhos]);
}

/**
 * Otimiza a imagem no navegador (WebP em várias larguras + miniatura borrada) e envia as variantes.
 * Se qualquer envio falhar, apaga o que já subiu para não deixar lixo no Storage.
 */
export async function enviarImagem(
  bucket: Bucket,
  pasta: string,
  origem: Blob,
  aoProgredir?: (feitos: number, total: number) => void,
): Promise<ImagemEnviada> {
  const hash = await hashDoConteudo(await origem.arrayBuffer());
  const base = `${pasta}/${hash}`;
  const otimizada = await otimizarImagem(origem);
  const enviados: string[] = [];

  try {
    for (const variante of otimizada.variantes) {
      const caminho = caminhoDaVariante(base, variante.largura);
      const { error } = await cliente().storage.from(bucket).upload(caminho, variante.blob, {
        contentType: 'image/webp',
        cacheControl: CACHE_LONGO,
        upsert: true,
      });
      if (error) throw error;
      enviados.push(caminho);
      aoProgredir?.(enviados.length, otimizada.variantes.length);
    }
  } catch (erro) {
    await removerArquivos(bucket, enviados);
    throw erro;
  }

  return {
    imagem_base: base,
    larguras: otimizada.variantes.map((variante) => variante.largura),
    largura_original: otimizada.larguraOriginal,
    altura_original: otimizada.alturaOriginal,
    blur: otimizada.blur,
  };
}

/** Envia o MP4 e gera a capa (primeiro quadro), que passa pela mesma otimização das fotos. */
export async function enviarVideo(
  pasta: string,
  arquivo: File,
): Promise<ImagemEnviada & { video_path: string }> {
  const hash = await hashDoConteudo(await arquivo.arrayBuffer());
  const videoPath = `${pasta}/${hash}.mp4`;

  const capa = await enviarImagem('portfolio', pasta, await capturarQuadroDoVideo(arquivo));
  const { error } = await cliente().storage.from('portfolio').upload(videoPath, arquivo, {
    contentType: 'video/mp4',
    cacheControl: CACHE_LONGO,
    upsert: true,
  });
  if (error) {
    await removerArquivos('portfolio', caminhosDaImagem(capa.imagem_base, capa.larguras));
    throw error;
  }
  return { ...capa, video_path: videoPath };
}
