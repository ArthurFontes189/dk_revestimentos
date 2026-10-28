import { describe, expect, it } from 'vitest';
import { formatarTelefoneBR, normalizarTelefone } from './telefone';

describe('normalizarTelefone', () => {
  it('deve tirar a pontuação quando o telefone vem formatado', () => {
    expect(normalizarTelefone('(61) 99999-1234')).toBe('61999991234');
  });

  it('deve tirar o DDI 55 quando o número tem 12 ou 13 dígitos', () => {
    expect(normalizarTelefone('5561999991234')).toBe('61999991234');
    expect(normalizarTelefone('556133334444')).toBe('6133334444');
  });

  it('deve manter o 55 quando ele é o DDD (número nacional de 11 dígitos)', () => {
    expect(normalizarTelefone('55999991234')).toBe('55999991234');
  });
});

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
