// Service worker do painel: guarda só o shell (HTML, JS, CSS, fontes). O Supabase fica em outra
// origem e nunca passa por aqui, para o painel não mostrar caixa ou lead velho como atual.
const CACHE = 'dk-painel-v1';

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.add(self.registration.scope)));
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

// A nova versão espera o admin aceitar, para não recarregar com um formulário preenchido.
self.addEventListener('message', (evento) => {
  if (evento.data === 'PULAR_ESPERA') void self.skipWaiting();
});

async function guardar(pedido, resposta) {
  if (resposta.ok) await (await caches.open(CACHE)).put(pedido, resposta.clone());
  return resposta;
}

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  const url = new URL(pedido.url);
  if (pedido.method !== 'GET' || url.origin !== self.location.origin) return;
  if (!url.href.startsWith(self.registration.scope)) return;

  if (pedido.mode === 'navigate') {
    evento.respondWith(
      fetch(pedido)
        .then((resposta) => guardar(self.registration.scope, resposta))
        .catch(() => caches.match(self.registration.scope)),
    );
    return;
  }

  // Arquivos com hash no nome nunca mudam; o resto atualiza em segundo plano.
  evento.respondWith(
    caches.match(pedido).then((guardado) => {
      const rede = fetch(pedido).then((resposta) => guardar(pedido, resposta));
      if (!guardado) return rede;
      if (url.pathname.includes('/assets/')) return guardado;
      rede.catch(() => undefined);
      return guardado;
    }),
  );
});
