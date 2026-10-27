import { expect, test, type Page } from '@playwright/test';

const SCRIPT_DA_META = 'connect.facebook.net';
const ID_DO_PIXEL = '1234567890';

type JanelaMeta = Window & { fbq?: { queue: ArrayLike<unknown>[] } };

/** Bloqueia a Meta nos testes e devolve a lista de pedidos que o site tentou fazer a ela. */
async function vigiarMeta(page: Page) {
  const pedidos: string[] = [];
  await page.route(`https://${SCRIPT_DA_META}/**`, (rota) => {
    pedidos.push(rota.request().url());
    return rota.abort();
  });
  return pedidos;
}

/** Lista os comandos enfileirados no `fbq` (init, track...), como "track:PageView". */
function comandosDoPixel(page: Page) {
  return page.evaluate(() =>
    ((window as JanelaMeta).fbq?.queue ?? []).map((item) =>
      Array.from(item as ArrayLike<unknown>)
        .slice(0, 2)
        .join(':'),
    ),
  );
}

const banner = (page: Page) => page.getByRole('region', { name: 'Preferências de cookies' });

test('deve mostrar o banner com as duas opções e nada da Meta quando é a primeira visita', async ({
  page,
}) => {
  const pedidos = await vigiarMeta(page);
  await page.goto('/');

  await expect(banner(page)).toBeVisible();
  const recusar = banner(page).getByRole('button', { name: 'Recusar' });
  const aceitar = banner(page).getByRole('button', { name: 'Aceitar' });
  await expect(recusar).toBeVisible();
  await expect(aceitar).toBeVisible();

  // Recusar é tão fácil quanto aceitar: mesmo tamanho, sem destaque para um dos lados.
  const [r, a] = await Promise.all([recusar.boundingBox(), aceitar.boundingBox()]);
  expect(r!.height).toBe(a!.height);
  expect(r!.width).toBe(a!.width);

  await page.waitForTimeout(500);
  expect(pedidos, 'nada deve ir à Meta antes da escolha').toEqual([]);
});

test('deve lembrar a recusa e nunca falar com a Meta quando o visitante recusa', async ({
  page,
}) => {
  const pedidos = await vigiarMeta(page);
  await page.goto('/');
  await banner(page).getByRole('button', { name: 'Recusar' }).click();
  await expect(banner(page)).toBeHidden();

  await page.reload();
  await expect(banner(page)).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('dk_consentimento'))).toBe('recusado');

  // Interagir com o site (abrir um trabalho) também não envia nada.
  await page.getByRole('button', { name: 'Ampliar a foto: Estante em escada' }).click();
  await page.waitForTimeout(500);
  expect(pedidos).toEqual([]);
  expect(await comandosDoPixel(page)).toEqual([]);
});

test('deve carregar o Pixel e registrar os eventos quando o visitante aceita', async ({ page }) => {
  const pedidos = await vigiarMeta(page);
  await page.goto('/');
  await banner(page).getByRole('button', { name: 'Aceitar' }).click();
  await expect(banner(page)).toBeHidden();

  await expect.poll(() => pedidos.length).toBeGreaterThan(0);
  expect(pedidos[0]).toContain('fbevents.js');
  expect(await comandosDoPixel(page)).toEqual(
    expect.arrayContaining([`init:${ID_DO_PIXEL}`, 'track:PageView']),
  );

  // Interesse em um trabalho vira "ViewContent".
  await page.getByRole('button', { name: 'Ampliar a foto: Estante em escada' }).click();
  await expect.poll(() => comandosDoPixel(page)).toContain('track:ViewContent');
});

test('deve registrar "Contact" quando quem aceitou clica no WhatsApp', async ({ page }) => {
  await vigiarMeta(page);
  await page.addInitScript(() => window.localStorage.setItem('dk_consentimento', 'aceito'));
  await page.goto('/');

  // Dispara o clique sem sair do site (o WhatsApp abriria em outra página).
  await page.locator('footer a[href^="https://wa.me/"]').evaluate((link: HTMLAnchorElement) => {
    link.addEventListener('click', (e) => e.preventDefault(), { once: true });
    link.click();
  });

  await expect.poll(() => comandosDoPixel(page)).toContain('track:Contact');
});

test('deve apagar os cookies da Meta e parar de enviar quando o visitante muda para recusar', async ({
  page,
}) => {
  await vigiarMeta(page);
  await page.addInitScript(() => window.localStorage.setItem('dk_consentimento', 'aceito'));
  await page.goto('/');
  await expect(banner(page)).toBeHidden();

  await page.evaluate(() => {
    document.cookie = '_fbp=fb.1.123.456; path=/';
  });
  await page.getByRole('button', { name: 'Preferências de cookies' }).click();
  await expect(banner(page)).toBeVisible();
  await banner(page).getByRole('button', { name: 'Recusar' }).click();

  expect(await page.evaluate(() => document.cookie)).not.toContain('_fbp');
  expect(await page.evaluate(() => localStorage.getItem('dk_consentimento'))).toBe('recusado');
});
