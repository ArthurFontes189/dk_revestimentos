import { describe, expect, it } from 'vitest';
import { formatarTelefoneBR } from './telefone';

describe('formatarTelefoneBR', () => {
  it('deve formatar celular quando tem 11 dígitos', () => {
    expect(formatarTelefoneBR('61999991234')).toBe('(61) 99999-1234');
  });

  it('deve formatar fixo quando tem 10 dígitos', () => {
    expect(formatarTelefoneBR('6133334444')).toBe('(61) 3333-4444');
  });

  it('deve ignorar o DDI quando o número vem com 55', () => {
    expect(formatarTelefoneBR('5561999991234')).toBe('(61) 99999-1234');
  });

  it('deve devolver o texto original quando o tamanho não é reconhecido', () => {
    expect(formatarTelefoneBR('12345')).toBe('12345');
  });
});
