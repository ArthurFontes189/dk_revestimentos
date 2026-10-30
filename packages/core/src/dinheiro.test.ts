import { describe, expect, it } from 'vitest';
import { lerValorBRL } from './dinheiro';

describe('lerValorBRL', () => {
  it('deve ler o formato brasileiro quando tem milhar com ponto e vírgula decimal', () => {
    expect(lerValorBRL('1.234,56')).toBe(1234.56);
  });

  it('deve ignorar o símbolo e os espaços quando o texto vem com R$', () => {
    expect(lerValorBRL('R$ 12.500,00')).toBe(12500);
  });

  it('deve ler a vírgula como decimal quando não há milhar', () => {
    expect(lerValorBRL('350,5')).toBe(350.5);
  });

  it('deve ler o ponto como decimal quando há 1 ou 2 casas depois dele', () => {
    expect(lerValorBRL('1234.56')).toBe(1234.56);
    expect(lerValorBRL('10.5')).toBe(10.5);
  });

  it('deve ler o ponto como milhar quando há grupos de três dígitos', () => {
    expect(lerValorBRL('1.234')).toBe(1234);
    expect(lerValorBRL('12.500.000')).toBe(12500000);
  });

  it('deve ler número inteiro quando não há separador', () => {
    expect(lerValorBRL('8000')).toBe(8000);
  });

  it('deve devolver nulo quando o texto está vazio', () => {
    expect(lerValorBRL('  ')).toBeNull();
  });

  it('deve devolver nulo quando o texto não é um valor', () => {
    expect(lerValorBRL('abc')).toBeNull();
    expect(lerValorBRL('12,345,67')).toBeNull();
    expect(lerValorBRL('-50')).toBeNull();
  });

  it('deve arredondar para centavos quando há mais de duas casas na vírgula', () => {
    expect(lerValorBRL('10,999')).toBe(11);
  });
});
