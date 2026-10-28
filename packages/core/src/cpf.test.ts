import { describe, expect, it } from 'vitest';
import { cpfValido, formatarCpf, somenteDigitos } from './cpf';

describe('cpfValido', () => {
  it('deve aceitar quando os dígitos verificadores estão certos', () => {
    expect(cpfValido('52998224725')).toBe(true);
  });

  it('deve aceitar quando o CPF vem com pontos e traço', () => {
    expect(cpfValido('529.982.247-25')).toBe(true);
  });

  it('deve recusar quando o dígito verificador está errado', () => {
    expect(cpfValido('52998224726')).toBe(false);
  });

  it('deve recusar quando todos os dígitos são iguais', () => {
    expect(cpfValido('11111111111')).toBe(false);
  });

  it('deve recusar quando o tamanho não é 11', () => {
    expect(cpfValido('5299822472')).toBe(false);
    expect(cpfValido('529982247250')).toBe(false);
  });
});

describe('formatarCpf', () => {
  it('deve formatar quando tem 11 dígitos', () => {
    expect(formatarCpf('52998224725')).toBe('529.982.247-25');
  });

  it('deve devolver o original quando o tamanho não é reconhecido', () => {
    expect(formatarCpf('123')).toBe('123');
  });
});

describe('somenteDigitos', () => {
  it('deve remover tudo que não é número quando recebe texto formatado', () => {
    expect(somenteDigitos('(61) 99999-1234')).toBe('61999991234');
  });
});
