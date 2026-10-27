import { describe, expect, it } from 'vitest';
import { depoimentoSchema, itemPortfolioSchema } from './portfolio';

describe('itemPortfolioSchema', () => {
  it('deve aceitar o item e limpar os espaços quando os dados são válidos', () => {
    const r = itemPortfolioSchema.parse({
      titulo: '  Deck à beira do lago ',
      descricao: ' Deck em curva. ',
      categoria: 'ÁREAS EXTERNAS',
    });
    expect(r.titulo).toBe('Deck à beira do lago');
    expect(r.descricao).toBe('Deck em curva.');
  });

  it('deve aceitar a descrição vazia quando o admin não preenche', () => {
    const r = itemPortfolioSchema.parse({ titulo: 'Estante', categoria: 'MARCENARIA' });
    expect(r.descricao).toBe('');
  });

  it('deve rejeitar o título curto demais quando tem só um caractere', () => {
    expect(itemPortfolioSchema.safeParse({ titulo: 'A', categoria: 'MARCENARIA' }).success).toBe(
      false,
    );
  });

  it('deve rejeitar a categoria desconhecida quando não é uma das cinco', () => {
    expect(itemPortfolioSchema.safeParse({ titulo: 'Estante', categoria: 'OUTRA' }).success).toBe(
      false,
    );
  });

  it('deve rejeitar a descrição longa demais quando passa de 600 caracteres', () => {
    expect(
      itemPortfolioSchema.safeParse({
        titulo: 'Estante',
        categoria: 'MARCENARIA',
        descricao: 'a'.repeat(601),
      }).success,
    ).toBe(false);
  });
});

describe('depoimentoSchema', () => {
  it('deve aceitar o depoimento sem nome nem legenda quando o admin só anexou a imagem', () => {
    expect(depoimentoSchema.safeParse({}).success).toBe(true);
  });

  it('deve transformar campos em branco em ausentes quando só há espaços', () => {
    const r = depoimentoSchema.parse({ nome: '   ', legenda: '' });
    expect(r.nome).toBeUndefined();
    expect(r.legenda).toBeUndefined();
  });

  it('deve rejeitar o nome longo demais quando passa de 60 caracteres', () => {
    expect(depoimentoSchema.safeParse({ nome: 'a'.repeat(61) }).success).toBe(false);
  });
});
