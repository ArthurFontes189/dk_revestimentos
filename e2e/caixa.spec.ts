import { expect, test, type Page } from '@playwright/test';
import { entrarComoAdmin, responderJson, semRolagemHorizontal, SUPABASE } from './apoio';

const URL_CAIXA = `${SUPABASE}/rest/v1/transactions*`;
const HOJE = new Date('2026-10-30T12:00:00');

function lancamento(campos: Record<string, unknown>) {
  return {
    id: 1,
    tipo: 'saida',
    categoria: 'Custos Oficina',
    descricao: null,
    valor: 100,
    data: '2026-10-20',
    client_id: null,
    service_id: null,
    worker_id: null,
    expense_id: null,
    created_at: '2026-10-20T12:00:00Z',
    services: null,
    ...campos,
  };
}

const LANCAMENTOS = [
  lancamento({
    id: 1,
    descricao: 'Conta de luz',
    valor: 300,
    data: '2026-10-28',
  }),
  lancamento({
    id: 2,
    tipo: 'entrada',
    categoria: 'Entrada da obra',
    descricao: 'Painel ripado',
    valor: 4000,
    data: '2026-10-15',
    service_id: 1,
    services: { descricao: 'Painel ripado na sala' },
  }),
  lancamento({
    id: 3,
    categoria: 'Diárias',
    descricao: 'Diária: José Ribeiro',
    valor: 1000,
    data: '2026-10-10',
    service_id: 1,
    worker_id: 7,
    services: { descricao: 'Painel ripado na sala' },
  }),
];

async function abrirCaixa(page: Page, corpo: unknown = LANCAMENTOS) {
  await entrarComoAdmin(page);
  await page.clock.setFixedTime(HOJE);
  const pedidos: string[] = [];
  await page.route(URL_CAIXA, async (rota) => {
    if (rota.request().method() === 'GET') {
      pedidos.push(rota.request().url());
      await responderJson(rota, corpo);
      return;
    }
    await rota.fallback();
  });
  await page.goto('/admin/#/caixa');
  return pedidos;
}

test('deve mostrar entradas, saídas e saldo do período quando o admin abre o caixa', async ({
  page,
}) => {
  await abrirCaixa(page);

  const totais = page.getByRole('group', { name: 'Totais do período' });
  await expect(totais).toContainText(/Entradas\s*R\$\s4\.000,00/);
  await expect(totais).toContainText(/Saídas\s*R\$\s1\.300,00/);
  await expect(totais).toContainText(/Saldo\s*R\$\s2\.700,00/);
  await expect(page.getByText('3 lançamentos')).toBeVisible();
  await expect(page.getByText('28/10/2026 · Custos Oficina')).toBeVisible();
  await semRolagemHorizontal(page);
});

test('deve consultar o mês atual quando o admin abre o caixa', async ({ page }) => {
  const pedidos = await abrirCaixa(page);

  await expect(page.getByLabel('De')).toHaveValue('2026-10-01');
  await expect(page.getByLabel('Até')).toHaveValue('2026-10-31');
  expect(pedidos[0]).toContain('data=gte.2026-10-01');
  expect(pedidos[0]).toContain('data=lte.2026-10-31');
});

test('deve consultar o ano inteiro quando o admin escolhe Este ano', async ({ page }) => {
  const pedidos = await abrirCaixa(page);

  await page.getByRole('button', { name: 'Este ano' }).click();

  await expect.poll(() => pedidos.at(-1)).toContain('data=gte.2026-01-01');
  expect(pedidos.at(-1)).toContain('data=lte.2026-12-31');
});

test('deve filtrar pela categoria quando o admin escolhe uma', async ({ page }) => {
  const pedidos = await abrirCaixa(page);

  await page.getByLabel('Categoria').selectOption('Vernizes');

  await expect.poll(() => pedidos.at(-1)).toContain('categoria=eq.Vernizes');
});

test('deve enviar o lançamento manual normalizado quando o admin lança uma saída', async ({
  page,
}) => {
  await abrirCaixa(page);
  let criado: unknown;
  await page.route(URL_CAIXA, async (rota) => {
    if (rota.request().method() === 'POST') {
      criado = rota.request().postDataJSON();
      await rota.fulfill({ status: 201, body: '' });
      return;
    }
    await rota.fallback();
  });

  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  await page.getByLabel('Categoria', { exact: true }).last().selectOption('Vernizes');
  await page.getByLabel('Descrição (opcional)').fill('Verniz marítimo');
  await page.getByLabel('Valor (R$)').fill('R$ 89,90');
  await page.getByRole('button', { name: 'Lançar no caixa' }).click();

  await expect
    .poll(() => criado)
    .toEqual({
      tipo: 'saida',
      categoria: 'Vernizes',
      descricao: 'Verniz marítimo',
      valor: 89.9,
      data: '2026-10-30',
    });
});

test('deve oferecer só Outras entradas e avisar quando o lançamento manual é entrada', async ({
  page,
}) => {
  await abrirCaixa(page);

  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  await page.getByLabel('Tipo').selectOption('entrada');

  await expect(page.getByLabel('Categoria', { exact: true }).last().locator('option')).toHaveText([
    'Outras entradas',
  ]);
  await expect(page.getByText('Dinheiro de cliente entra pela obra')).toBeVisible();
});

test('deve avisar e não enviar quando o valor do lançamento é zero', async ({ page }) => {
  await abrirCaixa(page);
  let enviou = false;
  await page.route(URL_CAIXA, async (rota) => {
    if (rota.request().method() === 'POST') enviou = true;
    await rota.fallback();
  });

  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  await page.getByLabel('Valor (R$)').fill('0');
  await page.getByRole('button', { name: 'Lançar no caixa' }).click();

  await expect(page.getByRole('dialog').getByRole('alert')).toHaveText('Informe o valor');
  expect(enviou).toBe(false);
});

test('deve avisar que o recebido da obra diminui quando o admin exclui uma entrada de obra', async ({
  page,
}) => {
  await abrirCaixa(page);
  let excluido: string | undefined;
  await page.route(URL_CAIXA, async (rota) => {
    if (rota.request().method() === 'DELETE') {
      excluido = rota.request().url();
      await rota.fulfill({ status: 204, body: '' });
      return;
    }
    await rota.fallback();
  });

  await page.getByRole('button', { name: 'Excluir: Painel ripado', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(
    'O valor recebido da obra "Painel ripado na sala" diminui na mesma quantia.',
  );
  await page.getByRole('button', { name: 'Excluir definitivamente' }).click();

  await expect.poll(() => excluido).toContain('id=eq.2');
});

test('deve bloquear a edição e a exclusão quando o lançamento é uma diária paga', async ({
  page,
}) => {
  await abrirCaixa(page);

  const diaria = page.getByRole('listitem').filter({ hasText: 'Diária: José Ribeiro' });
  await expect(diaria.getByText('Automático')).toBeVisible();
  await expect(diaria.getByRole('link', { name: /Gerir na obra|Abrir obras/ })).toBeVisible();
  await expect(diaria.getByRole('button')).toHaveCount(0);
});

test('deve mostrar o aviso de totais incompletos quando a consulta bate o limite', async ({
  page,
}) => {
  const muitos = Array.from({ length: 1000 }, (_, i) => lancamento({ id: i + 1, valor: 1 }));
  await abrirCaixa(page, muitos);

  await expect(page.getByRole('alert')).toContainText('totais podem estar incompletos');
});
