export function somenteDigitos(texto: string): string {
  return texto.replace(/\D/g, '');
}

/** Dígito verificador do CPF: pesos decrescentes até 2, resto de (soma × 10) por 11. */
function digitoVerificador(base: string): number {
  let soma = 0;
  for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (base.length + 1 - i);
  const resto = (soma * 10) % 11;
  return resto === 10 ? 0 : resto;
}

export function cpfValido(cpf: string): boolean {
  const digitos = somenteDigitos(cpf);
  // CPFs com todos os dígitos iguais passam na conta, mas não existem.
  if (digitos.length !== 11 || /^(\d)\1{10}$/.test(digitos)) return false;
  return (
    digitoVerificador(digitos.slice(0, 9)) === Number(digitos[9]) &&
    digitoVerificador(digitos.slice(0, 10)) === Number(digitos[10])
  );
}

/** Formata para exibição: 529.982.247-25. Devolve o original se o tamanho não for reconhecido. */
export function formatarCpf(cpf: string): string {
  const digitos = somenteDigitos(cpf);
  if (digitos.length !== 11) return cpf;
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
}
