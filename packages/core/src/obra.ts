import { deCentavos, paraCentavos } from './dinheiro';

export interface EntradaDre {
  valorTotal: number;
  /** Cada diária já com o total (valor × dias). */
  diarias: readonly number[];
  insumos: readonly number[];
}

export interface Dre {
  custoDiarias: number;
  custoInsumos: number;
  custoTotal: number;
  lucroPrevisto: number;
  /** Percentual com 1 casa decimal; 0 quando o valor total é 0. */
  margemPercentual: number;
}

const somar = (valores: readonly number[]): number =>
  valores.reduce((acc, v) => acc + paraCentavos(v), 0);

/** Regra da v1: lucro previsto = valor total − (diárias + insumos). */
export function calcularDre({ valorTotal, diarias, insumos }: EntradaDre): Dre {
  const total = paraCentavos(valorTotal);
  const dia = somar(diarias);
  const ins = somar(insumos);
  const custo = dia + ins;
  const lucro = total - custo;
  const margem = total === 0 ? 0 : Math.round((lucro / total) * 1000) / 10;
  return {
    custoDiarias: deCentavos(dia),
    custoInsumos: deCentavos(ins),
    custoTotal: deCentavos(custo),
    lucroPrevisto: deCentavos(lucro),
    margemPercentual: margem,
  };
}

/** Saldo a receber da obra; nunca negativo. */
export function saldoAReceber(valorTotal: number, valorEntrada: number): number {
  return deCentavos(Math.max(0, paraCentavos(valorTotal) - paraCentavos(valorEntrada)));
}

/** Total da diária de um trabalhador. */
export function totalDiarias(valorDiaria: number, diasTrabalhados: number): number {
  return deCentavos(paraCentavos(valorDiaria) * diasTrabalhados);
}
