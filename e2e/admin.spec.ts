import { expect, test } from '@playwright/test';
import { entrarComoAdmin, responderJson, semRolagemHorizontal, SUPABASE } from './apoio';

const URL_LEADS = `${SUPABASE}/rest/v1/leads*`;

const LEADS = [
  lead(1, 'Maria Souza', 'Pendente de Contato'),
  lead(2, 'João Lima', 'Em Negociação'),
  lead(3, 'Ana Costa', 'Pendente de Contato'),
];

function lead(id: number, nome: string, status: string) {
  return {
    id,
    nome,
    telefone: '61999991234',
    bairro: 'Asa Sul',
    tipo_servico: 'Marcenaria Sob Medida',
    mensagem: null,
    status,
    utm_source: 'instagram',
    utm_medium: null,
    utm_campaign: null,
    fbclid: null,
    pagina_entrada: '/',
    created_at: '2026-10-27T12:00:00Z',
    updated_at: '2026-10-27T12:00:00Z',
  };
}

const ehCelular = (largura: number) => largura < 768;

test('deve ir para o login quando não há sessão', async ({ page }) => {
  await page.goto('/admin/');
  await expect(page).toHaveURL(/#\/login$/);
  await expect(page.getByRole('heading', { name: 'Entrar no painel' })).toBeVisible();
  await semRolagemHorizontal(page);
});

test('deve listar os leads e contar os pendentes quando o admin está logado', async ({ page }) => {
  await entrarComoAdmin(page);
  await page.route(URL_LEADS, (rota) => responderJson(rota, LEADS));

  await page.goto('/admin/#/leads');

  await expect(page.getByRole('heading', { name: 'Leads', level: 1 })).toBeVisible();
  await expect(page.getByText('2 leads aguardando contato')).toBeVisible();
  await expect(page.getByRole('button', { name: /Maria Souza/ })).toBeVisible();
  await semRolagemHorizontal(page);
});

test('deve mostrar a navegação no lugar certo quando a tela muda de tamanho', async ({
  page,
}, info) => {
  await entrarComoAdmin(page);
  await page.route(URL_LEADS, (rota) => responderJson(rota, LEADS));
  await page.goto('/admin/#/leads');

  const largura = info.project.use.viewport?.width ?? 0;
  const menu = page.getByRole('navigation', { name: 'Principal' });
  await expect(menu).toBeVisible();
  const caixa = await menu.boundingBox();
  expect(caixa).not.toBeNull();

  if (ehCelular(largura)) {
    // Celular: navegação inferior.
    expect(caixa!.y).toBeGreaterThan((info.project.use.viewport?.height ?? 0) / 2);
  } else {
    // Computador: menu lateral à esquerda.
    expect(caixa!.x).toBeLessThan(50);
  }
});

test('deve alternar lista e detalhe no celular e mostrar os dois no PC', async ({ page }, info) => {
  await entrarComoAdmin(page);
  await page.route(URL_LEADS, (rota) => responderJson(rota, LEADS));
  await page.goto('/admin/#/leads');

  await page.getByRole('button', { name: /Maria Souza/ }).click();
  const lista = page.getByRole('region', { name: 'Lista de leads' });
  const detalhe = page.getByRole('heading', { name: 'Maria Souza', level: 2 });

  await expect(detalhe).toBeVisible();
  const titulo = page.getByRole('heading', { name: 'Leads', level: 1 });
  if (ehCelular(info.project.use.viewport?.width ?? 0)) {
    // O detalhe ocupa a tela toda: sem lista, título nem filtros.
    await expect(lista).toBeHidden();
    await expect(titulo).toBeHidden();
    await page.getByRole('button', { name: /Voltar para a lista/ }).click();
    await expect(lista).toBeVisible();
    await expect(titulo).toBeVisible();
  } else {
    await expect(lista).toBeVisible();
    await expect(titulo).toBeVisible();
  }
  await semRolagemHorizontal(page);
});

test('deve filtrar a lista quando o admin escolhe um status', async ({ page }) => {
  await entrarComoAdmin(page);
  await page.route(URL_LEADS, (rota) => responderJson(rota, LEADS));
  await page.goto('/admin/#/leads');

  await page.getByRole('button', { name: 'Em Negociação (1)' }).click();

  await expect(page.getByRole('button', { name: /João Lima/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Maria Souza/ })).toHaveCount(0);
});

test('deve enviar o novo status ao banco quando o admin troca o status', async ({ page }) => {
  await entrarComoAdmin(page);
  let atualizacao: unknown;
  await page.route(URL_LEADS, async (rota) => {
    const requisicao = rota.request();
    if (requisicao.method() === 'PATCH') {
      atualizacao = requisicao.postDataJSON();
      await rota.fulfill({ status: 204, body: '' });
      return;
    }
    await responderJson(rota, LEADS);
  });
  await page.goto('/admin/#/leads');

  await page.getByRole('button', { name: /Maria Souza/ }).click();
  await page.getByLabel('Status', { exact: true }).selectOption('Fechado');

  await expect.poll(() => atualizacao).toEqual({ status: 'Fechado' });
});

test('deve caber todos os itens do menu na tela quando é celular', async ({ page }, info) => {
  const largura = info.project.use.viewport?.width ?? 0;
  test.skip(!ehCelular(largura), 'a barra inferior só existe no celular');
  await entrarComoAdmin(page);
  await page.route(URL_LEADS, (rota) => responderJson(rota, LEADS));
  await page.goto('/admin/#/leads');

  const itens = await page
    .getByRole('navigation', { name: 'Principal' })
    .last()
    .locator('a, button')
    .evaluateAll((links) =>
      links.map((link) => ({
        texto: link.textContent,
        cortado: link.scrollWidth > link.clientWidth,
        direita: link.getBoundingClientRect().right,
      })),
    );

  expect(itens.length).toBe(5);
  for (const item of itens) {
    expect(item.cortado, `${item.texto} está cortado`).toBe(false);
    expect(item.direita, `${item.texto} passa da borda da tela`).toBeLessThanOrEqual(largura);
  }
});

test('deve abrir Caixa, Equipe, Portfólio e Depoimentos pelo item Mais quando é celular', async ({
  page,
}, info) => {
  const largura = info.project.use.viewport?.width ?? 0;
  test.skip(!ehCelular(largura), 'o item Mais só existe no celular');
  await entrarComoAdmin(page);
  await page.route(URL_LEADS, (rota) => responderJson(rota, LEADS));
  await page.goto('/admin/#/leads');

  await page.getByRole('button', { name: 'Mais' }).click();
  const extras = page.getByRole('navigation', { name: 'Mais opções' });
  await expect(extras.getByRole('link')).toHaveText([
    'Caixa',
    'Equipe',
    'Portfólio',
    'Depoimentos',
  ]);

  await extras.getByRole('link', { name: 'Equipe' }).click();
  await expect(page).toHaveURL(/#\/equipe$/);
  await expect(page.getByRole('navigation', { name: 'Mais opções' })).toBeHidden();
});
