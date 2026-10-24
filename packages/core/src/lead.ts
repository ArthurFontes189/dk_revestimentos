import { z } from 'zod';
import { TIPOS_SERVICO } from './enums';

/** Origem da campanha, capturada na chegada do visitante e gravada no lead. */
export const origemSchema = z.object({
  utm_source: z.string().max(200).optional(),
  utm_medium: z.string().max(200).optional(),
  utm_campaign: z.string().max(200).optional(),
  fbclid: z.string().max(500).optional(),
  pagina_entrada: z.string().max(500).optional(),
});

export const leadSchema = z.object({
  nome: z.string().trim().min(2, 'Informe seu nome').max(100),
  telefone: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .pipe(z.string().min(10, 'Telefone inválido').max(13, 'Telefone inválido')),
  bairro: z.string().trim().max(100).optional(),
  tipo_servico: z.enum(TIPOS_SERVICO),
  mensagem: z.string().trim().max(1000).optional(),
  ...origemSchema.shape,
});

export type NovoLead = z.infer<typeof leadSchema>;
