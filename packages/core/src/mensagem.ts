import type { TipoServico } from './enums';

export interface DadosMensagem {
  nome: string;
  tipo_servico: TipoServico;
  bairro?: string | undefined;
  mensagem?: string | undefined;
}

/** Texto pré-preenchido enviado ao WhatsApp da empresa junto com o pedido de orçamento. */
export function montarMensagemOrcamento({
  nome,
  tipo_servico,
  bairro,
  mensagem,
}: DadosMensagem): string {
  const linhas = [
    `Olá! Meu nome é ${nome} e gostaria de um orçamento.`,
    `Serviço: ${tipo_servico}`,
  ];
  if (bairro?.trim()) linhas.push(`Bairro: ${bairro.trim()}`);
  if (mensagem?.trim()) linhas.push(`Detalhes: ${mensagem.trim()}`);
  return linhas.join('\n');
}
