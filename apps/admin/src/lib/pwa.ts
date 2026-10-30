import { useSyncExternalStore } from 'react';

let esperando: ServiceWorker | null = null;
// Só recarrega quando o admin pediu a atualização (a 1ª visita também dispara `controllerchange`).
let atualizacaoPedida = false;
const ouvintes = new Set<() => void>();

function avisar(worker: ServiceWorker | null) {
  esperando = worker;
  ouvintes.forEach((ouvinte) => ouvinte());
}

/** Registra o service worker só no build de produção; no `dev` ele atrapalharia o recarregamento. */
export function registrarServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  void navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`)
    .then((registro) => {
      // Só há "versão nova" quando já existia um worker controlando a página (não na 1ª visita).
      if (registro.waiting && navigator.serviceWorker.controller) avisar(registro.waiting);
      registro.addEventListener('updatefound', () => {
        const novo = registro.installing;
        novo?.addEventListener('statechange', () => {
          if (novo.state === 'installed' && navigator.serviceWorker.controller) avisar(novo);
        });
      });
    })
    .catch(() => undefined);

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!atualizacaoPedida) return;
    atualizacaoPedida = false;
    window.location.reload();
  });
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

export function useVersaoNovaPronta(): boolean {
  return useSyncExternalStore(
    assinar,
    () => esperando !== null,
    () => false,
  );
}

export function aplicarVersaoNova() {
  atualizacaoPedida = true;
  esperando?.postMessage('PULAR_ESPERA');
}
