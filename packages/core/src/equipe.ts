import { z } from 'zod';
import { lerValorBRL } from './dinheiro';
import { normalizarTelefone } from './telefone';

/** Cargos sugeridos no cadastro (valores da v1); o campo aceita qualquer texto. */
export const CARGOS_SUGERIDOS = [
  'Marceneiro Líder',
  'Marceneiro de Bancada',
  'Montador de Móveis',
  'Ajudante Geral',
  'Pintor / Laqueador',
  'Gesseiro',
  'Eletricista',
  'Serralheiro',
  'Acabador',
] as const;

export const CATEGORIAS_INSUMO = [
  'Madeiras e MDF',
  'Ferragens',
  'Tintas e Vernizes',
  'Fitas de Borda e Colas',
  'Frete e Transporte',
  'Acessórios e Elétrica',
  'Outros Insumos',
] as const;
export type CategoriaInsumo = (typeof CATEGORIAS_INSUMO)[number];

const textoOpcional = (limite: number) =>
  z
    .string()
    .trim()
    .max(limite)
    .transform((valor) => (valor === '' ? null : valor));

const valor = (mensagem: string, aceitaZero: boolean) =>
  z.string().transform((texto, ctx) => {
    const lido = lerValorBRL(texto);
    if (lido === null || (!aceitaZero && lido === 0)) {
      ctx.addIssue({ code: 'custom', message: mensagem });
      return z.NEVER;
    }
    return lido;
  });

/** Cadastro de funcionário ou diarista. Telefone só com dígitos; o contrato é tratado à parte. */
export const funcionarioSchema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome').max(100),
  cargo: textoOpcional(60),
  telefone: z
    .string()
    .transform(normalizarTelefone)
    .refine((digitos) => digitos === '' || /^\d{10,11}$/.test(digitos), 'Telefone inválido')
    .transform((digitos) => (digitos === '' ? null : digitos)),
  chave_pix: textoOpcional(140),
  diaria_padrao: valor('Diária inválida', true),
  ativo: z.boolean(),
});

export type DadosFuncionario = z.infer<typeof funcionarioSchema>;

/** Alocação do funcionário numa obra: diária e dias ficam gravados na alocação. */
export const alocacaoSchema = z.object({
  employee_id: z.number().int().positive('Escolha o funcionário'),
  valor_diaria: valor('Informe a diária', false),
  dias_trabalhados: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Dias deve ser um número inteiro')
    .transform(Number)
    .refine((dias) => dias > 0 && dias <= 365, 'Informe de 1 a 365 dias'),
});

export type DadosAlocacao = z.infer<typeof alocacaoSchema>;

export const insumoSchema = z.object({
  categoria: z.enum(CATEGORIAS_INSUMO),
  descricao: z.string().trim().min(2, 'Descreva o insumo').max(200),
  valor: valor('Informe o valor', false),
  lancar_no_caixa: z.boolean(),
});

export type DadosInsumo = z.infer<typeof insumoSchema>;
