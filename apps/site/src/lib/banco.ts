import { readFile } from 'node:fs/promises';

/**
 * Leitura dos dados públicos (portfólio e depoimentos) NA HORA DA PUBLICAÇÃO do site.
 * Usa só a chave publishable e as políticas de RLS (visitante anônimo só lê o que está publicado).
 * Qualquer falha devolve `null`: quem chama usa a reserva embutida e o site nunca fica sem conteúdo.
 */
const URL_DO_PROJETO = import.meta.env.PUBLIC_SUPABASE_URL ?? '';
const CHAVE = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
const TEMPO_LIMITE_MS = 8000;

export const urlDoProjeto = URL_DO_PROJETO;

export async function buscarLinhas<T>(tabela: string, consulta: string): Promise<T[] | null> {
  // Usado só pelo build de teste (e2e): lê as linhas de um arquivo em vez da rede.
  const fixture = process.env.BANCO_FIXTURE;
  if (fixture) {
    const dados = JSON.parse(await readFile(fixture, 'utf8')) as Record<string, unknown[]>;
    return (dados[tabela] ?? []) as T[];
  }

  if (import.meta.env.PUBLIC_PORTFOLIO_ESTATICO === 'true') return null;
  if (!URL_DO_PROJETO || !CHAVE) return null;

  const controle = new AbortController();
  const temporizador = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  try {
    const resposta = await fetch(`${URL_DO_PROJETO}/rest/v1/${tabela}?${consulta}`, {
      headers: { apikey: CHAVE },
      signal: controle.signal,
    });
    if (!resposta.ok) {
      console.warn(`[banco] ${tabela}: resposta ${resposta.status}; usando a reserva embutida.`);
      return null;
    }
    return (await resposta.json()) as T[];
  } catch (erro) {
    console.warn(`[banco] ${tabela}: ${(erro as Error).message}; usando a reserva embutida.`);
    return null;
  } finally {
    clearTimeout(temporizador);
  }
}
