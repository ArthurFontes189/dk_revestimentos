/**
 * Hash curto (16 caracteres hexadecimais do SHA-256) do conteúdo do arquivo.
 * Usado no nome dos arquivos: se o conteúdo muda, o endereço muda, e o cache longo é seguro.
 */
export async function hashDoConteudo(conteudo: ArrayBuffer): Promise<string> {
  const resumo = await crypto.subtle.digest('SHA-256', conteudo);
  return [...new Uint8Array(resumo)]
    .slice(0, 8)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
