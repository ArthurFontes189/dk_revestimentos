export const SENHA_TAMANHO_MINIMO = 10;

/** Valida a nova senha do admin. Retorna a mensagem de erro ou `null` quando está válida. */
export function validarNovaSenha(senha: string, confirmacao: string): string | null {
  if (senha.length < SENHA_TAMANHO_MINIMO) {
    return `A senha precisa ter pelo menos ${SENHA_TAMANHO_MINIMO} caracteres.`;
  }
  if (senha !== confirmacao) {
    return 'As senhas não conferem.';
  }
  return null;
}
