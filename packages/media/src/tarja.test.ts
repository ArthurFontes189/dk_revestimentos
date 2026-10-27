import { describe, expect, it } from 'vitest';
import { retanguloDoArrasto, TAMANHO_MINIMO_TARJA } from './tarja';

describe('retanguloDoArrasto', () => {
  it('deve normalizar para frações da imagem quando o arrasto vai do canto superior esquerdo ao inferior direito', () => {
    const r = retanguloDoArrasto(
      { x: 50, y: 100 },
      { x: 150, y: 300 },
      { largura: 200, altura: 400 },
    );
    expect(r).toEqual({ x: 0.25, y: 0.25, largura: 0.5, altura: 0.5 });
  });

  it('deve produzir o mesmo retângulo quando o arrasto vai em sentido contrário', () => {
    const area = { largura: 200, altura: 400 };
    expect(retanguloDoArrasto({ x: 150, y: 300 }, { x: 50, y: 100 }, area)).toEqual(
      retanguloDoArrasto({ x: 50, y: 100 }, { x: 150, y: 300 }, area),
    );
  });

  it('deve limitar ao contorno da imagem quando o dedo passa da borda', () => {
    const r = retanguloDoArrasto(
      { x: 150, y: 350 },
      { x: 500, y: 900 },
      { largura: 200, altura: 400 },
    );
    expect(r).not.toBeNull();
    expect(r!.x + r!.largura).toBeLessThanOrEqual(1);
    expect(r!.y + r!.altura).toBeLessThanOrEqual(1);
  });

  it('deve ignorar o toque quando o retângulo é minúsculo', () => {
    const area = { largura: 1000, altura: 1000 };
    const quase = TAMANHO_MINIMO_TARJA * 1000 - 1;
    expect(retanguloDoArrasto({ x: 10, y: 10 }, { x: 10 + quase, y: 10 + quase }, area)).toBeNull();
  });
});
