import { expect, test, type Page } from '@playwright/test';
import { semRolagemHorizontal, SUPABASE } from './apoio';

const URL_LEADS = `${SUPABASE}/rest/v1/leads*`;

/** Abre a home e espera a ilha do formulário hidratar (ela só carrega ao aparecer na tela). */
async function abrirFormulario(page: Page, caminho = '/') {
  // O WhatsApp abre em outra aba; não precisamos sair do ambiente de teste.
  await page.context().route('https://wa.me/**', (rota) => rota.abort());
  await page.goto(caminho);
  await page.locator('#orcamento').scrollIntoViewIfNeeded();
  await expect(page.locator('astro-island[client="visible"]')).not.toHaveAttribute('ssr', '');
}

async function preencherPasso1(page: Page) {
  await page.getByLabel('Seu nome').fill('Maria Souza');
  await page.getByLabel('WhatsApp (com DDD)').fill('(61) 99999-1234');
  await page.getByRole('button', { name: 'Continuar' }).click();
}

async function preencherPasso2(page: Page) {
  await page.getByLabel('O que você precisa?').selectOption('Cozinhas, Closets & Suítes');
  await page.getByLabel('Bairro (opcional)').fill('Asa Sul');
  await page.getByRole('button', { name: 'Pedir orçamento' }).click();
}

test('deve caber na tela sem rolagem horizontal quando abre a home', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'DK Revestimentos' })).toBeVisible();
  await semRolagemHorizontal(page);
});

test('deve pedir o nome quando o passo 1 é enviado vazio', async ({ page }) => {
  await abrirFormulario(page);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('alert')).toContainText('Informe seu nome');
});

test('deve enviar o lead com a origem da campanha quando o banco responde', async ({ page }) => {
  let corpo: Record<string, unknown> | undefined;
  await page.route(URL_LEADS, async (rota) => {
    corpo = rota.request().postDataJSON() as Record<string, unknown>;
    await rota.fulfill({ status: 201, body: '' });
  });

  await abrirFormulario(page, '/?utm_source=instagram&utm_campaign=cozinhas&fbclid=abc123');
  await preencherPasso1(page);
  await preencherPasso2(page);

  await expect(page.getByRole('heading', { name: 'Recebemos o seu pedido!' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Continuar no WhatsApp' })).toHaveAttribute(
    'href',
    /^https:\/\/wa\.me\/5561900000000\?text=/,
  );

  expect(corpo).toMatchObject({
    nome: 'Maria Souza',
    telefone: '61999991234',
    tipo_servico: 'Cozinhas, Closets & Suítes',
    bairro: 'Asa Sul',
    utm_source: 'instagram',
    utm_campaign: 'cozinhas',
    fbclid: 'abc123',
  });
  // O visitante nunca escolhe o status (o banco também bloqueia).
  expect(corpo).not.toHaveProperty('status');
});

test('deve avisar e oferecer o WhatsApp direto quando o banco falha', async ({ page }) => {
  await page.route(URL_LEADS, (rota) => rota.fulfill({ status: 500, body: '{}' }));

  await abrirFormulario(page);
  await preencherPasso1(page);
  await preencherPasso2(page);

  await expect(page.getByRole('alert')).toContainText('Não conseguimos registrar');
  await expect(page.getByRole('link', { name: 'Falar direto no WhatsApp' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recebemos o seu pedido!' })).toHaveCount(0);
});

test('deve fingir sucesso sem gravar quando a isca anti-spam é preenchida', async ({ page }) => {
  let chamadas = 0;
  await page.route(URL_LEADS, async (rota) => {
    chamadas += 1;
    await rota.fulfill({ status: 201, body: '' });
  });

  await abrirFormulario(page);
  await preencherPasso1(page);
  await page.locator('input[name="site"]').evaluate((el: HTMLInputElement) => {
    el.value = 'http://spam.exemplo';
  });
  await preencherPasso2(page);

  await expect(page.getByRole('heading', { name: 'Recebemos o seu pedido!' })).toBeVisible();
  expect(chamadas).toBe(0);
});
