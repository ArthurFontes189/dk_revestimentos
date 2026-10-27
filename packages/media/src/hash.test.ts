import { describe, expect, it } from 'vitest';
import { hashDoConteudo } from './hash';

const bytes = (texto: string) => new TextEncoder().encode(texto).buffer as ArrayBuffer;

describe('hashDoConteudo', () => {
  it('deve gerar o mesmo hash de 16 caracteres quando o conteúdo é igual', async () => {
    const a = await hashDoConteudo(bytes('foto-1'));
    const b = await hashDoConteudo(bytes('foto-1'));
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
  });

  it('deve gerar hashes diferentes quando o conteúdo muda', async () => {
    expect(await hashDoConteudo(bytes('foto-1'))).not.toBe(await hashDoConteudo(bytes('foto-2')));
  });
});
