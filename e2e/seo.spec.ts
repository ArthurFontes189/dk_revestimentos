import { expect, test } from '@playwright/test';
import { semRolagemHorizontal } from './apoio';

const ORIGEM = 'http://127.0.0.1:4173';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('dk_consentimento', 'recusado'));
});

test('deve ter título, descrição, canonical e cartão de compartilhamento na home', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/DK Revestimentos/);
  const descricao = await page.locator('meta[name="description"]').getAttribute('content');
  expect(descricao?.length).toBeGreaterThan(60);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${ORIGEM}/`);
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'pt_BR');
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    'content',
    'summary_large_image',
  );

  // A imagem do cartão precisa ter endereço absoluto (WhatsApp/Facebook não resolvem caminho relativo).
  const imagem = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(imagem).toMatch(new RegExp(`^${ORIGEM}/.+\\.jpe?g$`));
  const resposta = await page.request.get(imagem!);
  expect(resposta.status()).toBe(200);
  expect(resposta.headers()['content-type']).toContain('image/jpeg');
});

test('deve pedir para não indexar quando PUBLIC_INDEXAR não está ligado', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
});

test('deve publicar dados estruturados da empresa sem inventar telefone ou endereço', async ({
  page,
}) => {
  await page.goto('/');
  const bruto = await page.locator('script[type="application/ld+json"]').textContent();
  const dados = JSON.parse(bruto!) as Record<string, unknown>;

  expect(dados['@type']).toBe('Organization');
  expect(dados.name).toBe('DK Revestimentos');
  expect(dados).not.toHaveProperty('telephone');
  expect(dados).not.toHaveProperty('address');
  expect(dados).not.toHaveProperty('aggregateRating');
});

test('deve listar só páginas indexáveis no sitemap', async ({ request }) => {
  const resposta = await request.get('/sitemap.xml');
  expect(resposta.status()).toBe(200);
  const xml = await resposta.text();
  expect(xml).toContain(`<loc>${ORIGEM}/</loc>`);
  expect(xml).toContain(`<loc>${ORIGEM}/privacidade/</loc>`);
  expect(xml).not.toContain('decks-e-areas-externas');
});

test('deve bloquear a indexação no robots.txt quando PUBLIC_INDEXAR não está ligado', async ({
  request,
}) => {
  const resposta = await request.get('/robots.txt');
  expect(resposta.status()).toBe(200);
  expect(await resposta.text()).toContain('Disallow: /');
});

test('deve abrir a política de privacidade com os direitos do titular e sem rolagem lateral', async ({
  page,
}) => {
  await page.goto('/privacidade/');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Política de privacidade' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: /Seus direitos/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Cookies/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Voltar ao site' })).toBeVisible();
  await semRolagemHorizontal(page);
});

test('deve levar à política de privacidade pelo rodapé da home', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Política de privacidade' }).click();
  await expect(page).toHaveURL(/\/privacidade\/$/);
});

test('deve mostrar a página 404 com caminho de volta quando o endereço não existe', async ({
  page,
}) => {
  const resposta = await page.goto('/pagina-que-nao-existe/');
  expect(resposta?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Voltar ao início' })).toBeVisible();
});
