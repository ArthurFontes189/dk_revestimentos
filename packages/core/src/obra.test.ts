import { describe, expect, it } from 'vitest';
import { calcularDre, saldoAReceber, totalDiarias } from './obra';

describe('calcularDre', () => {
  it('deve calcular lucro e margem como na v1 quando há diárias e insumos', () => {
    const dre = calcularDre({ valorTotal: 10000, diarias: [800, 600], insumos: [1500.5] });
    expect(dre.custoDiarias).toBe(1400);
    expect(dre.custoInsumos).toBe(1500.5);
    expect(dre.custoTotal).toBe(2900.5);
    expect(dre.lucroPrevisto).toBe(7099.5);
    expect(dre.margemPercentual).toBe(71);
  });

  it('deve evitar erro de ponto flutuante quando os valores são decimais', () => {
    const dre = calcularDre({ valorTotal: 0.3, diarias: [0.1], insumos: [0.2] });
    expect(dre.lucroPrevisto).toBe(0);
  });

  it('deve retornar margem 0 quando o valor total é 0', () => {
    expect(calcularDre({ valorTotal: 0, diarias: [100], insumos: [] }).margemPercentual).toBe(0);
  });

  it('deve retornar lucro negativo quando os custos superam o valor total', () => {
    expect(calcularDre({ valorTotal: 100, diarias: [150], insumos: [] }).lucroPrevisto).toBe(-50);
  });
});

describe('saldoAReceber', () => {
  it('deve retornar total menos entrada quando a entrada é parcial', () => {
    expect(saldoAReceber(5000, 1500)).toBe(3500);
  });
  it('deve retornar 0 quando a entrada supera o total', () => {
    expect(saldoAReceber(1000, 1200)).toBe(0);
  });
});

describe('totalDiarias', () => {
  it('deve multiplicar valor por dias quando há dias trabalhados', () => {
    expect(totalDiarias(250.5, 3)).toBe(751.5);
  });
});
