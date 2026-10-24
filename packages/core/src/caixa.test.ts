import { describe, expect, it } from 'vitest';
import { resumirCaixa, totalPagoPeloCliente, type Lancamento } from './caixa';

const lancamentos: Lancamento[] = [
  { tipo: 'entrada', valor: 2000 },
  { tipo: 'saida', valor: 450.75 },
  { tipo: 'entrada', valor: 500 },
];

describe('resumirCaixa', () => {
  it('deve separar entradas, saídas e saldo quando há os dois tipos', () => {
    expect(resumirCaixa(lancamentos)).toEqual({ entradas: 2500, saidas: 450.75, saldo: 2049.25 });
  });
  it('deve retornar zeros quando não há lançamentos', () => {
    expect(resumirCaixa([])).toEqual({ entradas: 0, saidas: 0, saldo: 0 });
  });
});

describe('totalPagoPeloCliente', () => {
  it('deve ignorar saídas quando o cliente tem lançamentos de saída (bug da v1)', () => {
    expect(totalPagoPeloCliente(lancamentos)).toBe(2500);
  });
});
