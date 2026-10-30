import { z } from 'zod';
import { lerValorBRL } from './dinheiro';
import { TIPOS_TRANSACAO, type TipoTransacao } from './enums';

// A mesma lista vive no `check` de `transactions` (supabase/migrations): mudar aqui exige migration.
export const CATEGORIA_ENTRADA_MANUAL = 'Outras entradas';

export const CATEGORIAS_SAIDA_MANUAL = [
  'Madeiras & Insumos',
  'Vernizes',
  'Lixas & Parafusos',
  'Frete & Transporte',
  'Manutenção & Ferramentas',
  'Custos Oficina',
  'Outras saídas',
] as const;

/** Categorias de cada tipo no filtro do caixa, incluindo as que o sistema lança sozinho. */
export const CATEGORIAS_DO_CAIXA: Record<TipoTransacao, readonly string[]> = {
  entrada: ['Entrada da obra', 'Recebimento', CATEGORIA_ENTRADA_MANUAL],
  saida: [...CATEGORIAS_SAIDA_MANUAL, 'Diárias', 'Insumos & Materiais'],
};

export const TODAS_AS_CATEGORIAS = [
  ...CATEGORIAS_DO_CAIXA.entrada,
  ...CATEGORIAS_DO_CAIXA.saida,
] as const;

/** Data ISO (aaaa-mm-dd) que existe no calendário. */
const dataReal = z.string().refine((valor) => {
  const data = new Date(`${valor}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(valor) && data.toISOString().startsWith(valor);
}, 'Data inválida');

/** Lançamento manual do caixa. Dinheiro de cliente entra pela obra, não por aqui. */
export const lancamentoSchema = z
  .object({
    tipo: z.enum(TIPOS_TRANSACAO),
    categoria: z.string(),
    descricao: z
      .string()
      .trim()
      .max(300)
      .transform((valor) => (valor === '' ? null : valor)),
    valor: z.string().transform((texto, ctx) => {
      const lido = lerValorBRL(texto);
      if (lido === null || lido === 0) {
        ctx.addIssue({ code: 'custom', message: 'Informe o valor' });
        return z.NEVER;
      }
      return lido;
    }),
    data: dataReal,
  })
  .refine(
    ({ tipo, categoria }) =>
      tipo === 'entrada'
        ? categoria === CATEGORIA_ENTRADA_MANUAL
        : (CATEGORIAS_SAIDA_MANUAL as readonly string[]).includes(categoria),
    { path: ['categoria'], message: 'Categoria inválida para este tipo' },
  );

export type DadosLancamento = z.infer<typeof lancamentoSchema>;

export type AtalhoPeriodo = 'mes' | 'mes-passado' | 'ano';

export interface Periodo {
  de: string;
  ate: string;
}

const doisDigitos = (n: number) => String(n).padStart(2, '0');
const iso = (ano: number, mes: number, dia: number) =>
  `${ano}-${doisDigitos(mes)}-${doisDigitos(dia)}`;

/** Período de um atalho, em datas do calendário local (sem `toISOString`, que troca o dia pelo fuso). */
export function periodoDoAtalho(atalho: AtalhoPeriodo, hoje: Date): Periodo {
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth() + 1;
  if (atalho === 'ano') return { de: iso(ano, 1, 1), ate: iso(ano, 12, 31) };

  const alvo =
    atalho === 'mes' ? { ano, mes } : mes === 1 ? { ano: ano - 1, mes: 12 } : { ano, mes: mes - 1 };
  // O dia 0 do mês seguinte é o último dia deste mês.
  const ultimoDia = new Date(alvo.ano, alvo.mes, 0).getDate();
  return { de: iso(alvo.ano, alvo.mes, 1), ate: iso(alvo.ano, alvo.mes, ultimoDia) };
}

export interface LancamentoFiltravel {
  data: string;
  categoria: string;
}

export interface FiltroCaixa {
  de: string;
  ate: string;
  /** Vazio = todas as categorias. */
  categoria: string;
}

/** Datas ISO se comparam como texto. Período e categoria vazios não filtram. */
export function filtrarLancamentos<T extends LancamentoFiltravel>(
  lancamentos: readonly T[],
  { de, ate, categoria }: FiltroCaixa,
): T[] {
  return lancamentos.filter(
    (l) =>
      (de === '' || l.data >= de) &&
      (ate === '' || l.data <= ate) &&
      (categoria === '' || l.categoria === categoria),
  );
}

/** aaaa-mm-dd → dd/mm/aaaa, o único formato de data do painel. */
export function formatarDataBR(isoData: string): string {
  return isoData.split('-').reverse().join('/');
}

/** Tipo de lançamento, para decidir o que o painel permite fazer com ele. */
export type OrigemLancamento = 'manual' | 'entrada-de-obra' | 'automatico';

export function origemDoLancamento(l: {
  service_id: number | null;
  worker_id: number | null;
  expense_id: number | null;
}): OrigemLancamento {
  if (l.worker_id !== null || l.expense_id !== null) return 'automatico';
  return l.service_id !== null ? 'entrada-de-obra' : 'manual';
}
