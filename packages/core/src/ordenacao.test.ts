import { describe, expect, it } from 'vitest';
import { moverNaLista, proximaOrdem } from './ordenacao';

const lista = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

describe('moverNaLista', () => {
  it('deve trocar com o vizinho de cima quando o item sobe', () => {
    expect(moverNaLista(lista, 'b', -1)).toEqual([
      { id: 'b', ordem: 0 },
      { id: 'a', ordem: 1 },
      { id: 'c', ordem: 2 },
    ]);
  });

  it('deve trocar com o vizinho de baixo quando o item desce', () => {
    expect(moverNaLista(lista, 'b', 1)).toEqual([
      { id: 'a', ordem: 0 },
      { id: 'c', ordem: 1 },
      { id: 'b', ordem: 2 },
    ]);
  });

  it('deve devolver a mesma ordem numerada quando o item já está no topo', () => {
    expect(moverNaLista(lista, 'a', -1)).toEqual([
      { id: 'a', ordem: 0 },
      { id: 'b', ordem: 1 },
      { id: 'c', ordem: 2 },
    ]);
  });

  it('deve renumerar tudo de 0 a n-1 quando a ordem antiga tinha valores repetidos', () => {
    const r = moverNaLista([{ id: 'x' }, { id: 'y' }], 'y', -1);
    expect(r.map((i) => i.ordem)).toEqual([0, 1]);
  });

  it('deve lançar erro quando o item não está na lista', () => {
    expect(() => moverNaLista(lista, 'z', 1)).toThrow(/não encontrado/);
  });
});

describe('proximaOrdem', () => {
  it('deve retornar 0 quando a lista está vazia', () => {
    expect(proximaOrdem([])).toBe(0);
  });

  it('deve retornar o maior valor mais um quando há itens', () => {
    expect(proximaOrdem([{ ordem: 3 }, { ordem: 7 }, { ordem: 1 }])).toBe(8);
  });
});
