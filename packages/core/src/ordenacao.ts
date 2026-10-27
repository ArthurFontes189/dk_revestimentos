export interface NovaOrdem {
  id: string;
  ordem: number;
}

/**
 * Move um item uma posição para cima (-1) ou para baixo (+1) e devolve a ordem 0..n-1 de TODOS
 * os itens. Renumerar tudo evita problemas quando a ordem antiga tem valores repetidos.
 */
export function moverNaLista(
  itens: readonly { id: string }[],
  id: string,
  direcao: -1 | 1,
): NovaOrdem[] {
  const ids = itens.map((item) => item.id);
  const posicao = ids.indexOf(id);
  if (posicao === -1) throw new Error('Item não encontrado na lista');
  const destino = posicao + direcao;
  if (destino >= 0 && destino < ids.length) {
    const outro = ids[destino] as string;
    ids[destino] = id;
    ids[posicao] = outro;
  }
  return ids.map((itemId, ordem) => ({ id: itemId, ordem }));
}

/** Valor de `ordem` para um item novo: vai para o fim da lista. */
export function proximaOrdem(itens: readonly { ordem: number }[]): number {
  return itens.length === 0 ? 0 : Math.max(...itens.map((item) => item.ordem)) + 1;
}
