import { imagemDoBanco, type ImagemDoBanco } from '@dk/media';
import { buscarLinhas, urlDoProjeto } from './banco';

export interface DepoimentoExibido extends ImagemDoBanco {
  id: string;
  nome: string | null;
  legenda: string | null;
}

interface LinhaDepoimento {
  id: string;
  imagem_base: string;
  larguras: number[];
  largura_original: number;
  altura_original: number;
  blur: string | null;
  nome: string | null;
  legenda: string | null;
}

let cache: Promise<DepoimentoExibido[]> | null = null;

/** Depoimentos visíveis, na ordem do admin. Sem banco (ou sem itens), devolve lista vazia: a seção some. */
export function carregarDepoimentos(): Promise<DepoimentoExibido[]> {
  cache ??= (async () => {
    const linhas = await buscarLinhas<LinhaDepoimento>(
      'testimonials',
      'select=*&visivel=eq.true&order=ordem.asc,created_at.asc',
    );
    return (linhas ?? []).map((linha) => ({
      id: linha.id,
      nome: linha.nome,
      legenda: linha.legenda,
      ...imagemDoBanco(urlDoProjeto, 'depoimentos', linha),
    }));
  })();
  return cache;
}
