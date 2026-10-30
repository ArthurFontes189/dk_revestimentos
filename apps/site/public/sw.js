// Service worker do site público: shell e imagens já vistas, com limite de tamanho do cache.
// O painel (/admin/) tem service worker próprio e fica fora daqui.
const CACHE = 'dk-site-v1';
const LIMITE_DE_ARQUIVOS = 120;

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.add(self.registration.scope)));
  void self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

async function guardar(pedido, resposta) {
  if (!resposta.ok) return resposta;
  const cache = await caches.open(CACHE);
  await cache.put(pedido, resposta.clone());
  const chaves = await cache.keys();
  // Remove os mais antigos (a lista vem na ordem de inserção).
  await Promise.all(
    chaves.slice(0, Math.max(0, chaves.length - LIMITE_DE_ARQUIVOS)).map((c) => cache.delete(c)),
  );
  return resposta;
}

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  const url = new URL(pedido.url);
  if (pedido.method !== 'GET' || url.origin !== self.location.origin) return;
  if (!url.href.startsWith(self.registration.scope)) return;
  if (url.pathname.startsWith(new URL('admin/', self.registration.scope).pathname)) return;
  // Vídeos usam Range; o cache não os serve direito.
  if (pedido.headers.has('range')) return;

  if (pedido.mode === 'navigate') {
    evento.respondWith(
      fetch(pedido)
        .then((resposta) => guardar(pedido, resposta))
        .catch(async () => (await caches.match(pedido)) ?? caches.match(self.registration.scope)),
    );
    return;
  }

  evento.respondWith(
    caches.match(pedido).then((guardado) => {
      const rede = fetch(pedido).then((resposta) => guardar(pedido, resposta));
      if (!guardado) return rede;
      rede.catch(() => undefined);
      return guardado;
    }),
  );
});
