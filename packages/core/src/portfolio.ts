import { z } from 'zod';
import { CATEGORIAS_PORTFOLIO } from './enums';

/** Campos editáveis de um item do portfólio (as mídias são tratadas à parte). */
export const itemPortfolioSchema = z.object({
  titulo: z.string().trim().min(2, 'Informe o título').max(120, 'Título longo demais'),
  descricao: z.string().trim().max(600, 'Descrição longa demais').default(''),
  categoria: z.enum(CATEGORIAS_PORTFOLIO),
});

export type DadosItemPortfolio = z.infer<typeof itemPortfolioSchema>;

/** Texto em branco vira "ausente", para não gravar string vazia no banco. */
const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((valor) => (valor ? valor : undefined));

/** Campos opcionais de um depoimento (a imagem é obrigatória, mas é tratada à parte). */
export const depoimentoSchema = z.object({
  nome: textoOpcional(60),
  legenda: textoOpcional(120),
});

export type DadosDepoimento = z.infer<typeof depoimentoSchema>;
