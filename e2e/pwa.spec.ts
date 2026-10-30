import { expect, test, type Page } from '@playwright/test';

test.use({ serviceWorkers: 'allow' });

const APPS = [
  { nome: 'site', caminho: '/', escopo: '/', nomeCurto: 'DK' },
  { nome: 'painel', caminho: '/admin/', escopo: '/admin/', nomeCurto: 'DK Painel' },
] as const;

async function aguardarControle(page: Page) {
  await page.evaluate(() => navigator.serviceWorker.ready);
  // Na primeira visita o worker só passa a controlar a página depois de assumir (clients.claim).
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
}

for (const app of APPS) {
  test(`deve publicar um manifest instalável quando abre o ${app.nome}`, async ({ page }) => {
    await page.goto(app.caminho);

    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    const resposta = await page.request.get(new URL(href!, page.url()).href);
    expect(resposta.ok()).toBe(true);
    const manifest = await resposta.json();

    expect(manifest.short_name).toBe(app.nomeCurto);
    expect(manifest.display).toBe('standalone');
    expect(new URL(manifest.scope, resposta.url()).pathname).toBe(app.escopo);
    const tamanhos = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(tamanhos).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
    for (const icone of manifest.icons) {
      const png = await page.request.get(new URL(icone.src, resposta.url()).href);
      expect(png.status(), icone.src).toBe(200);
    }
  });

  test(`deve abrir o ${app.nome} sem conexão depois da primeira visita`, async ({
    page,
    context,
  }) => {
    await page.goto(app.caminho);
    await aguardarControle(page);
    // Dá tempo de a visita gravar a página e seus arquivos no cache.
    await page.reload();
    await aguardarControle(page);

    await context.setOffline(true);
    await page.reload();

    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.locator('h1').first()).toBeVisible();
  });
}

test('deve manter o painel fora do cache do site público', async ({ page }) => {
  await page.goto('/');
  await aguardarControle(page);

  const escopos = await page.evaluate(async () =>
    (await navigator.serviceWorker.getRegistrations()).map((r) => new URL(r.scope).pathname),
  );
  expect(escopos).toEqual(['/']);

  await page.goto('/admin/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  const depois = await page.evaluate(async () =>
    (await navigator.serviceWorker.getRegistrations()).map((r) => new URL(r.scope).pathname).sort(),
  );
  expect(depois).toEqual(['/', '/admin/']);

  const chaves = await page.evaluate(async () => {
    const cache = await caches.open('dk-site-v1');
    return (await cache.keys()).map((c) => new URL(c.url).pathname);
  });
  expect(chaves.some((c) => c.startsWith('/admin/'))).toBe(false);
});
