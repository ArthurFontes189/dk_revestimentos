/** Formata para exibição: (61) 99999-1234. Devolve o original se o tamanho não for reconhecido. */
export function formatarTelefoneBR(telefone: string): string {
  let digitos = telefone.replace(/\D/g, '');
  if (digitos.length >= 12 && digitos.startsWith('55')) digitos = digitos.slice(2);
  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  }
  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  return telefone;
}
