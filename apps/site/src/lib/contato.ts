import { montarLinkWhatsApp } from '@dk/core';

/** Número da empresa (só dígitos, com DDI). Vem de PUBLIC_WHATSAPP_NUMBER; hoje é fictício. */
export const NUMERO_WHATSAPP = import.meta.env.PUBLIC_WHATSAPP_NUMBER ?? '';

/** Falha no build se o número faltar (evita publicar um botão quebrado). */
export function linkWhatsApp(mensagem?: string): string {
  return montarLinkWhatsApp(NUMERO_WHATSAPP, mensagem);
}
