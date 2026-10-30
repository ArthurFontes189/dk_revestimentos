// Cálculos em centavos inteiros para evitar erro de ponto flutuante (0,1 + 0,2).
export const paraCentavos = (reais: number): number => Math.round(reais * 100);
export const deCentavos = (centavos: number): number => centavos / 100;

const formatadorBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatarBRL = (reais: number): string => formatadorBRL.format(reais);

/**
 * Lê um valor digitado no painel ("R$ 1.234,56", "350,5", "1234.56"). Devolve nulo se não for valor.
 * O ponto só é milhar quando seguido de grupos de exatamente três dígitos.
 */
export function lerValorBRL(texto: string): number | null {
  const limpo = texto.replace(/R\$|\s/g, '');
  if (limpo === '') return null;
  let normalizado: string;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(limpo))
    normalizado = limpo.replace(/\./g, '').replace(',', '.');
  else if (/^\d+(,\d+)?$/.test(limpo)) normalizado = limpo.replace(',', '.');
  else if (/^\d+\.\d{1,2}$/.test(limpo)) normalizado = limpo;
  else return null;
  return deCentavos(paraCentavos(Number(normalizado)));
}
