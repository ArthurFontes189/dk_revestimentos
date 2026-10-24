// Cálculos em centavos inteiros para evitar erro de ponto flutuante (0,1 + 0,2).
export const paraCentavos = (reais: number): number => Math.round(reais * 100);
export const deCentavos = (centavos: number): number => centavos / 100;

const formatadorBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatarBRL = (reais: number): string => formatadorBRL.format(reais);
