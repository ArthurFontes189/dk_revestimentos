/** Origem da campanha de um visitante; os limites seguem as colunas da tabela `leads`. */
export interface Origem {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  fbclid?: string;
  pagina_entrada?: string;
}

const LIMITES = {
  utm_source: 200,
  utm_medium: 200,
  utm_campaign: 200,
  fbclid: 500,
  pagina_entrada: 500,
} as const;

const PARAMETROS_DE_CAMPANHA = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid'] as const;

/** Lê os parâmetros de campanha da URL (`location.search`) e registra a página de entrada. */
export function extrairOrigem(search: string, pathname: string): Origem {
  const params = new URLSearchParams(search);
  const origem: Origem = {};
  for (const nome of PARAMETROS_DE_CAMPANHA) {
    const valor = params.get(nome)?.trim();
    if (valor) origem[nome] = valor.slice(0, LIMITES[nome]);
  }
  origem.pagina_entrada = pathname.slice(0, LIMITES.pagina_entrada);
  return origem;
}

/** Verdadeiro quando a visita veio de uma campanha (e não de acesso direto). */
export function temOrigemDeCampanha(origem: Origem): boolean {
  return PARAMETROS_DE_CAMPANHA.some((nome) => Boolean(origem[nome]));
}
