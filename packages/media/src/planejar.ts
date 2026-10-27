/** Larguras (em pixels) geradas para cada imagem enviada pelo painel. */
export const LARGURAS_PADRAO = [480, 960, 1920] as const;

/**
 * Larguras a gerar: as padrão que cabem na imagem, sem ampliar nada.
 * Se a original fica entre duas padrão (ex.: 1280), ela própria vira a maior variante.
 * Sempre devolve pelo menos uma largura, em ordem crescente.
 */
export function planejarLarguras(
  larguraOriginal: number,
  padrao: readonly number[] = LARGURAS_PADRAO,
): number[] {
  if (!Number.isFinite(larguraOriginal) || larguraOriginal <= 0) {
    throw new Error('Largura inválida');
  }
  const ordenadas = [...padrao].sort((a, b) => a - b);
  const maior = ordenadas[ordenadas.length - 1] ?? larguraOriginal;
  const topo = Math.min(larguraOriginal, maior);
  const menores = ordenadas.filter((largura) => largura < topo);
  return [...menores, topo];
}

/** Altura que mantém a proporção da imagem original ao reduzi-la para `largura`. */
export function alturaProporcional(
  larguraOriginal: number,
  alturaOriginal: number,
  largura: number,
): number {
  return Math.round((alturaOriginal * largura) / larguraOriginal);
}
