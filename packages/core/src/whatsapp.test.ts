import { describe, expect, it } from 'vitest';
import { montarLinkWhatsApp, normalizarTelefoneBR } from './whatsapp';

describe('normalizarTelefoneBR', () => {
  it('deve acrescentar o DDI quando ele falta', () => {
    expect(normalizarTelefoneBR('(61) 99999-1234')).toBe('5561999991234');
  });
  it('deve manter um único DDI quando o usuário já o digitou (bug da v1)', () => {
    expect(normalizarTelefoneBR('+55 61 99999-1234')).toBe('5561999991234');
  });
  it('deve aceitar telefone fixo quando vem só com DDD', () => {
    expect(normalizarTelefoneBR('61 3333-4444')).toBe('556133334444');
  });
});

describe('montarLinkWhatsApp', () => {
  it('deve codificar a mensagem quando ela tem acentos e pontuação', () => {
    expect(montarLinkWhatsApp('61999991234', 'Olá, quero um orçamento!')).toBe(
      'https://wa.me/5561999991234?text=Ol%C3%A1%2C%20quero%20um%20or%C3%A7amento!',
    );
  });
  it('deve omitir o texto quando não há mensagem', () => {
    expect(montarLinkWhatsApp('61999991234')).toBe('https://wa.me/5561999991234');
  });
  it('deve lançar erro quando o número não está configurado', () => {
    expect(() => montarLinkWhatsApp('')).toThrow(/WhatsApp/);
  });
  it('deve lançar erro quando o número tem dígitos de menos', () => {
    expect(() => montarLinkWhatsApp('1234')).toThrow(/WhatsApp/);
  });
});
