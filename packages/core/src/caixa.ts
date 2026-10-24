import { deCentavos, paraCentavos } from './dinheiro';
import type { TipoTransacao } from './enums';

export interface Lancamento {
  tipo: TipoTransacao;
  valor: number;
}

export interface ResumoCaixa {
  entradas: number;
  saidas: number;
  saldo: number;
}

/**
 * Soma entradas e saídas separadamente.
 * Corrige a v1, que tratava qualquer tipo diferente de "Entrada" como saída.
 */
export function resumirCaixa(lancamentos: readonly Lancamento[]): ResumoCaixa {
  let entradas = 0;
  let saidas = 0;
  for (const { tipo, valor } of lancamentos) {
    if (tipo === 'entrada') entradas += paraCentavos(valor);
    else saidas += paraCentavos(valor);
  }
  return {
    entradas: deCentavos(entradas),
    saidas: deCentavos(saidas),
    saldo: deCentavos(entradas - saidas),
  };
}

/** Total pago por um cliente: só ENTRADAS (a v1 somava as saídas também). */
export function totalPagoPeloCliente(lancamentos: readonly Lancamento[]): number {
  return resumirCaixa(lancamentos.filter((l) => l.tipo === 'entrada')).entradas;
}
