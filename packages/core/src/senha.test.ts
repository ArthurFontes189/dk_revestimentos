import { describe, expect, it } from 'vitest';
import { SENHA_TAMANHO_MINIMO, validarNovaSenha } from './senha';

describe('validarNovaSenha', () => {
  it('deve retornar null quando a senha é longa o bastante e a confirmação confere', () => {
    expect(validarNovaSenha('uma-senha-longa-1', 'uma-senha-longa-1')).toBeNull();
  });

  it('deve retornar erro quando a senha é curta demais', () => {
    const erro = validarNovaSenha('curta', 'curta');
    expect(erro).toContain(String(SENHA_TAMANHO_MINIMO));
  });

  it('deve retornar erro quando a confirmação é diferente', () => {
    expect(validarNovaSenha('uma-senha-longa-1', 'uma-senha-longa-2')).toMatch(/não conferem/);
  });

  it('deve aceitar exatamente o tamanho mínimo quando a confirmação confere', () => {
    const senha = 'a'.repeat(SENHA_TAMANHO_MINIMO);
    expect(validarNovaSenha(senha, senha)).toBeNull();
  });
});
