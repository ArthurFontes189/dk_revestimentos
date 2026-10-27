const base = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Caminho dentro do site respeitando o BASE_PATH (ex.: "/dk_revestimentos/privacidade/"). */
export function url(caminho: string): string {
  return `${base}/${caminho.replace(/^\//, '')}`;
}
