import { extrairOrigem, temOrigemDeCampanha, type Origem } from '@dk/core';

const CHAVE = 'dk_origem';
const CAMPOS = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'pagina_entrada'] as const;

/**
 * Lê a origem guardada nesta visita; devolve `{}` se não houver ou se estiver inválida.
 * Validação manual (sem zod) para este script, que roda em toda página, ficar mínimo.
 */
export function lerOrigem(): Origem {
  try {
    const bruto = sessionStorage.getItem(CHAVE);
    if (!bruto) return {};
    const dados: unknown = JSON.parse(bruto);
    if (typeof dados !== 'object' || dados === null) return {};
    const origem: Origem = {};
    for (const campo of CAMPOS) {
      const valor = (dados as Record<string, unknown>)[campo];
      if (typeof valor === 'string' && valor) origem[campo] = valor;
    }
    return origem;
  } catch {
    return {};
  }
}

/**
 * Guarda de onde o visitante veio (anúncio, UTM, fbclid) para gravar no lead.
 * Uma nova campanha substitui a anterior; um acesso direto mantém a origem já guardada.
 */
export function capturarOrigem(): void {
  try {
    const atual = extrairOrigem(window.location.search, window.location.pathname);
    const jaTemOrigem = sessionStorage.getItem(CHAVE) !== null;
    if (temOrigemDeCampanha(atual) || !jaTemOrigem) {
      sessionStorage.setItem(CHAVE, JSON.stringify(atual));
    }
  } catch {
    // Armazenamento indisponível (modo privado, bloqueio): o lead segue sem origem.
  }
}
