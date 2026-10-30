import { z } from 'zod';
import { deCentavos, lerValorBRL, paraCentavos } from './dinheiro';
import { STATUS_OBRA } from './enums';
import type { Lancamento } from './caixa';
import { totalPagoPeloCliente } from './caixa';

const textoOpcional = (limite: number) =>
  z
    .string()
    .trim()
    .max(limite)
    .transform((valor) => (valor === '' ? null : valor));

const valorEmReais = (mensagem: string) =>
  z.string().transform((texto, ctx) => {
    const valor = lerValorBRL(texto);
    if (valor === null) {
      ctx.addIssue({ code: 'custom', message: mensagem });
      return z.NEVER;
    }
    return valor;
  });

const dataReal = z
  .string()
  .trim()
  .refine((valor) => {
    if (valor === '') return true;
    const data = new Date(`${valor}T00:00:00Z`);
    return /^\d{4}-\d{2}-\d{2}$/.test(valor) && data.toISOString().startsWith(valor);
  }, 'Data inválida')
  .transform((valor) => (valor === '' ? null : valor));

/** Ficha de obra no painel. O valor recebido não entra aqui: a fonte é o caixa. */
export const obraSchema = z.object({
  client_id: z.number().int().positive('Escolha o cliente'),
  descricao: z.string().trim().min(3, 'Descreva a obra').max(300),
  materiais: textoOpcional(1000),
  forma_pagamento: textoOpcional(300),
  responsavel: textoOpcional(100),
  data_entrega: dataReal,
  valor_total: valorEmReais('Valor inválido'),
  status: z.enum(STATUS_OBRA),
});

export type DadosObra = z.infer<typeof obraSchema>;

/** Obra nova: aceita a entrada inicial, que vira o primeiro lançamento no caixa. */
export const novaObraSchema = obraSchema
  .extend({
    valor_entrada: z
      .string()
      .transform((texto) => (texto.trim() === '' ? 0 : lerValorBRL(texto)))
      .refine((valor) => valor !== null, 'Valor inválido') as z.ZodType<number, string>,
  })
  .refine((obra) => paraCentavos(obra.valor_entrada) <= paraCentavos(obra.valor_total), {
    path: ['valor_entrada'],
    message: 'A entrada não pode passar do valor total',
  });

export interface TotaisCliente {
  contratado: number;
  pago: number;
  saldo: number;
}

/** Total contratado (obras), total pago (só entradas do caixa) e saldo nunca negativo. */
export function totaisDoCliente(
  obras: readonly { valor_total: number }[],
  lancamentos: readonly Lancamento[],
): TotaisCliente {
  const contratado = obras.reduce((soma, obra) => soma + paraCentavos(obra.valor_total), 0);
  const pago = paraCentavos(totalPagoPeloCliente(lancamentos));
  return {
    contratado: deCentavos(contratado),
    pago: deCentavos(pago),
    saldo: deCentavos(Math.max(0, contratado - pago)),
  };
}
