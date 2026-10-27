import { describe, expect, it } from 'vitest';
import { alturaProporcional, planejarLarguras } from './planejar';

describe('planejarLarguras', () => {
  it('deve gerar as três larguras padrão quando a imagem é grande', () => {
    expect(planejarLarguras(3000)).toEqual([480, 960, 1920]);
  });

  it('deve incluir a largura original quando ela fica entre duas padrão', () => {
    expect(planejarLarguras(1280)).toEqual([480, 960, 1280]);
  });

  it('deve repetir nenhuma largura quando a original é igual a uma padrão', () => {
    expect(planejarLarguras(960)).toEqual([480, 960]);
    expect(planejarLarguras(480)).toEqual([480]);
  });

  it('deve usar só a largura original quando a imagem é menor que a menor padrão', () => {
    expect(planejarLarguras(400)).toEqual([400]);
  });

  it('deve limitar a 1920 quando a imagem passa de Full HD', () => {
    expect(Math.max(...planejarLarguras(8000))).toBe(1920);
  });

  it('deve lançar erro quando a largura é inválida', () => {
    expect(() => planejarLarguras(0)).toThrow(/Largura inválida/);
    expect(() => planejarLarguras(Number.NaN)).toThrow(/Largura inválida/);
  });
});

describe('alturaProporcional', () => {
  it('deve manter a proporção quando reduz a imagem', () => {
    expect(alturaProporcional(1280, 960, 480)).toBe(360);
  });

  it('deve arredondar para o inteiro mais próximo quando a conta não fecha', () => {
    expect(alturaProporcional(1000, 333, 480)).toBe(160);
  });
});
