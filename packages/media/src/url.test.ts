import { describe, expect, it } from 'vitest';
import { caminhoDaVariante, maiorVariante, montarSrcset, urlPublica } from './url';

const PROJETO = 'https://abc.supabase.co';

describe('caminhoDaVariante', () => {
  it('deve montar o nome com a largura quando há uma base', () => {
    expect(caminhoDaVariante('itens/ab12', 960)).toBe('itens/ab12-960.webp');
  });
});

describe('urlPublica', () => {
  it('deve montar o endereço público do Storage quando o projeto termina com barra', () => {
    expect(urlPublica(`${PROJETO}/`, 'portfolio', 'itens/ab12-480.webp')).toBe(
      'https://abc.supabase.co/storage/v1/object/public/portfolio/itens/ab12-480.webp',
    );
  });
});

describe('montarSrcset', () => {
  it('deve listar todas as larguras em ordem crescente quando elas vêm embaralhadas', () => {
    expect(montarSrcset(PROJETO, 'portfolio', 'x/y', [960, 480])).toBe(
      [
        'https://abc.supabase.co/storage/v1/object/public/portfolio/x/y-480.webp 480w',
        'https://abc.supabase.co/storage/v1/object/public/portfolio/x/y-960.webp 960w',
      ].join(', '),
    );
  });
});

describe('maiorVariante', () => {
  it('deve devolver o endereço da maior largura quando há várias', () => {
    expect(maiorVariante(PROJETO, 'portfolio', 'x/y', [480, 1920, 960])).toBe(
      'https://abc.supabase.co/storage/v1/object/public/portfolio/x/y-1920.webp',
    );
  });

  it('deve lançar erro quando não há nenhuma largura', () => {
    expect(() => maiorVariante(PROJETO, 'portfolio', 'x/y', [])).toThrow(/largura/i);
  });
});
