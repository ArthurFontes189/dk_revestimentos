/** Retângulo em frações (0 a 1) da imagem, independente do tamanho em que ela é exibida. */
export interface Retangulo {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

interface Ponto {
  x: number;
  y: number;
}

/** Menor tarja aceita (fração da imagem): evita criar uma por engano com um simples toque. */
export const TAMANHO_MINIMO_TARJA = 0.01;

const limitar = (valor: number) => Math.min(1, Math.max(0, valor));

/**
 * Converte o arrasto (pontos em pixels dentro da área exibida) em um retângulo em frações.
 * Funciona em qualquer direção do arrasto e nunca sai da imagem. Devolve `null` se ficar minúsculo.
 */
export function retanguloDoArrasto(
  inicio: Ponto,
  fim: Ponto,
  area: { largura: number; altura: number },
): Retangulo | null {
  const x1 = limitar(Math.min(inicio.x, fim.x) / area.largura);
  const x2 = limitar(Math.max(inicio.x, fim.x) / area.largura);
  const y1 = limitar(Math.min(inicio.y, fim.y) / area.altura);
  const y2 = limitar(Math.max(inicio.y, fim.y) / area.altura);
  const largura = x2 - x1;
  const altura = y2 - y1;
  if (largura < TAMANHO_MINIMO_TARJA || altura < TAMANHO_MINIMO_TARJA) return null;
  return { x: x1, y: y1, largura, altura };
}
