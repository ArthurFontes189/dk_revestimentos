// Valores exatamente como no diagnóstico da v1 (docs/DIAGNOSTICO-V1.md, seção 5).
export const STATUS_LEAD = ['Pendente de Contato', 'Em Negociação', 'Fechado', 'Perdido'] as const;
export type StatusLead = (typeof STATUS_LEAD)[number];

export const STATUS_OBRA = [
  'A Iniciar',
  'Em Produção / Oficina',
  'Em Montagem / Obra',
  'Concluído',
] as const;
export type StatusObra = (typeof STATUS_OBRA)[number];

export const TIPOS_SERVICO = [
  'Painéis & Revestimentos',
  'Marcenaria Sob Medida',
  'Cozinhas, Closets & Suítes',
  'Ambientes Externos',
  'Espaço Corporativo / Comercial',
  'Outro Projeto Personalizado',
] as const;
export type TipoServico = (typeof TIPOS_SERVICO)[number];

export const TIPOS_TRANSACAO = ['entrada', 'saida'] as const;
export type TipoTransacao = (typeof TIPOS_TRANSACAO)[number];

export const CATEGORIAS_PORTFOLIO = [
  'MARCENARIA',
  'MÓVEIS SOB MEDIDA',
  'ÁREAS EXTERNAS',
  'MADEIRA & REVESTIMENTOS',
  'PROJETOS ESPECIAIS',
] as const;
export type CategoriaPortfolio = (typeof CATEGORIAS_PORTFOLIO)[number];
