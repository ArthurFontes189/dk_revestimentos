/** Nome do arquivo de uma variante: "<base>-<largura>.webp". */
export function caminhoDaVariante(base: string, largura: number): string {
  return `${base}-${largura}.webp`;
}

/** Endereço público de um arquivo de um bucket público do Supabase Storage. */
export function urlPublica(supabaseUrl: string, bucket: string, caminho: string): string {
  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${caminho}`;
}

/** Valor do atributo `srcset` com todas as variantes, da menor para a maior. */
export function montarSrcset(
  supabaseUrl: string,
  bucket: string,
  base: string,
  larguras: readonly number[],
): string {
  return [...larguras]
    .sort((a, b) => a - b)
    .map(
      (largura) =>
        `${urlPublica(supabaseUrl, bucket, caminhoDaVariante(base, largura))} ${largura}w`,
    )
    .join(', ');
}

/** Endereço da maior variante (usada na ampliação da imagem). */
export function maiorVariante(
  supabaseUrl: string,
  bucket: string,
  base: string,
  larguras: readonly number[],
): string {
  if (larguras.length === 0) throw new Error('Nenhuma largura disponível');
  return urlPublica(supabaseUrl, bucket, caminhoDaVariante(base, Math.max(...larguras)));
}
