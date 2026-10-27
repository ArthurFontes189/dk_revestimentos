import { expect, test } from '@playwright/test';
import { semRolagemHorizontal, SUPABASE } from './apoio';

const PAGINAS = [
  {
    caminho: '/decks-e-areas-externas/',
    titulo: /Decks e áreas externas/,
    servico: 'Ambientes Externos',
  },
  {
    caminho: '/moveis-sob-medida/',
    titulo: /Móveis de madeira sob medida/,
    servico: 'Marcenaria Sob Medida',
  },
  {
    caminho: '/marcenaria-sob-medida/',
    titulo: /Marcenaria sob medida/,
    servico: 'Marcenaria Sob Medida',
  },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('dk_consentimento', 'recusado'));
});

for (const pagina of PAGINAS) {
  test(`deve abrir a página de anúncio ${pagina.caminho} com formulário, trabalhos reais e noindex`, async ({
    page,
  }) => {
    await page.goto(pagina.caminho);

    await expect(page.getByRole('heading', { level: 1, name: pagina.titulo })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(page.locator('#orcamento')).toBeVisible();
    await expect(
      page.getByRole('main').getByRole('link', { name: 'Falar no WhatsApp' }),
    ).toBeVisible();
    // Página leve e focada: sem barra fixa nem menu de navegação.
    await expect(page.locator('#barra-cta')).toHaveCount(0);

    const imagens = page.locator('main section').last().locator('img');
    expect(await imagens.count()).toBeGreaterThanOrEqual(3);
    await semRolagemHorizontal(page);
  });
}

test('deve já escolher o serviço no passo 2 quando o visitante vem de um anúncio', async ({
  page,
}) => {
  await page.goto('/decks-e-areas-externas/');
  await page.locator('#orcamento').scrollIntoViewIfNeeded();
  await expect(page.locator('astro-island')).not.toHaveAttribute('ssr', '');

  await page.getByLabel('Seu nome').fill('Maria Souza');
  await page.getByLabel('WhatsApp (com DDD)').fill('(61) 99999-1234');
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByLabel('O que você precisa?')).toHaveValue('Ambientes Externos');
});

test('deve enviar o serviço da página e a campanha quando o lead vem de um anúncio', async ({
  page,
}) => {
  let corpo: Record<string, unknown> | undefined;
  await page.route(`${SUPABASE}/rest/v1/leads*`, async (rota) => {
    corpo = rota.request().postDataJSON() as Record<string, unknown>;
    await rota.fulfill({ status: 201, body: '' });
  });
  await page.context().route('https://wa.me/**', (rota) => rota.abort());

  await page.goto('/moveis-sob-medida/?utm_source=facebook&utm_campaign=moveis&fbclid=xyz');
  await page.locator('#orcamento').scrollIntoViewIfNeeded();
  await expect(page.locator('astro-island')).not.toHaveAttribute('ssr', '');

  await page.getByLabel('Seu nome').fill('João Lima');
  await page.getByLabel('WhatsApp (com DDD)').fill('(61) 98888-7777');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Pedir orçamento' }).click();

  await expect(page.getByRole('heading', { name: 'Recebemos o seu pedido!' })).toBeVisible();
  expect(corpo).toMatchObject({
    tipo_servico: 'Marcenaria Sob Medida',
    utm_source: 'facebook',
    utm_campaign: 'moveis',
    fbclid: 'xyz',
    pagina_entrada: '/moveis-sob-medida/',
  });
});
