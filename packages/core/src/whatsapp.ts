const DDI_BRASIL = '55';

/** Mantém só dígitos e garante o DDI 55 (a v1 duplicava o DDI se o usuário já o digitasse). */
export function normalizarTelefoneBR(telefone: string): string {
  const digitos = telefone.replace(/\D/g, '');
  // DDD + número = 10 ou 11 dígitos; com DDI = 12 ou 13.
  if (digitos.length >= 12 && digitos.startsWith(DDI_BRASIL)) return digitos;
  return DDI_BRASIL + digitos;
}

/** Falha alto em vez de gerar um botão quebrado (`wa.me/55`) quando a variável de ambiente falta. */
export function montarLinkWhatsApp(numero: string, mensagem?: string): string {
  const digitos = normalizarTelefoneBR(numero);
  if (digitos.length < 12) {
    throw new Error('Número de WhatsApp ausente ou inválido. Configure PUBLIC_WHATSAPP_NUMBER.');
  }
  const base = `https://wa.me/${digitos}`;
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base;
}
