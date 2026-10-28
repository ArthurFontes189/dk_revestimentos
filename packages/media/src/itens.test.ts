import { describe, expect, it } from 'vitest';
import { imagemDoBanco, ordenarPortfolio } from './itens';

const PROJETO = 'https://abc.supabase.co';
const base = 'storage/v1/object/public/portfolio';

describe('imagemDoBanco', () => {
  const linha = {
    imagem_base: 'itens/ab12',
    larguras: [960, 480, 1920],
    largura_original: 2400,
    altura_original: 1600,
    blur: 'data:image/webp;base64,AAAA',
  };

  it('deve montar src, srcset e a versão grande quando há várias larguras', () => {
    const r = imagemDoBanco(PROJETO, 'portfolio', linha);
    expect(r.src).toBe(`${PROJETO}/${base}/itens/ab12-480.webp`);
    expect(r.grande).toBe(`${PROJETO}/${base}/itens/ab12-1920.webp`);
    expect(r.srcset).toBe(
      [
        `${PROJETO}/${base}/itens/ab12-480.webp 480w`,
        `${PROJETO}/${base}/itens/ab12-960.webp 960w`,
        `${PROJETO}/${base}/itens/ab12-1920.webp 1920w`,
      ].join(', '),
    );
  });

  it('deve usar as dimensões originais quando reserva o espaço da imagem', () => {
    const r = imagemDoBanco(PROJETO, 'portfolio', linha);
    expect(r.largura).toBe(2400);
    expect(r.altura).toBe(1600);
  });

  it('deve manter o blur quando existe e nulo quando não existe', () => {
    expect(imagemDoBanco(PROJETO, 'portfolio', linha).blur).toBe('data:image/webp;base64,AAAA');
    expect(imagemDoBanco(PROJETO, 'portfolio', { ...linha, blur: null }).blur).toBeNull();
  });

  it('deve ignorar um blur que não é imagem quando o valor é suspeito', () => {
    const r = imagemDoBanco(PROJETO, 'portfolio', { ...linha, blur: 'javascript:alert(1)' });
    expect(r.blur).toBeNull();
  });
});

describe('ordenarPortfolio', () => {
  it('deve colocar os destaques primeiro e respeitar a ordem dentro de cada grupo', () => {
    const r = ordenarPortfolio([
      { id: 'a', destaque: false, ordem: 0 },
      { id: 'b', destaque: true, ordem: 5 },
      { id: 'c', destaque: false, ordem: 1 },
      { id: 'd', destaque: true, ordem: 2 },
    ]);
    expect(r.map((i) => i.id)).toEqual(['d', 'b', 'a', 'c']);
  });

  it('deve preservar a lista original quando ordena', () => {
    const original = [
      { id: 'a', destaque: false, ordem: 1 },
      { id: 'b', destaque: false, ordem: 0 },
    ];
    ordenarPortfolio(original);
    expect(original.map((i) => i.id)).toEqual(['a', 'b']);
  });
});
