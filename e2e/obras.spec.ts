import { expect, test, type Page } from '@playwright/test';
import { entrarComoAdmin, responderJson, semRolagemHorizontal, SUPABASE } from './apoio';

const URL_RESUMO = `${SUPABASE}/rest/v1/obras_resumo*`;
const URL_SERVICOS = `${SUPABASE}/rest/v1/services*`;
const URL_TRANSACOES = `${SUPABASE}/rest/v1/transactions*`;
const URL_CLIENTES = `${SUPABASE}/rest/v1/clients*`;
const URL_RECEBIMENTO = `${SUPABASE}/rest/v1/rpc/registrar_recebimento`;
const URL_DEFINIR = `${SUPABASE}/rest/v1/rpc/definir_recebido`;

function obra(id: number, descricao: string, status: string, total: number, recebido: number) {
  return {
    id,
    client_id: 1,
    lead_id: null,
    descricao,
    materiais: null,
    forma_pagamento: null,
    responsavel: null,
    data_entrega: null,
    valor_total: total,
    status,
    concluida_em: null,
    created_at: '2026-10-29T12:00:00Z',
    updated_at: '2026-10-29T12:00:00Z',
    valor_recebido: recebido,
    saldo: Math.max(0, total - recebido),
  };
}

const OBRAS = [
  obra(1, 'Painel ripado na sala', 'A Iniciar', 10000, 4000),
  obra(2, 'Cozinha planejada', 'Concluído', 5000, 5000),
];

const CLIENTES = [{ id: 1, codigo: 'CLI-0001', nome: 'Maria Souza' }];

async function abrirObras(page: Page) {
  await entrarComoAdmin(page);
  await page.route(URL_RESUMO, (rota) => responderJson(rota, OBRAS));
  await page.route(URL_CLIENTES, (rota) => responderJson(rota, CLIENTES));
  await page.goto('/admin/#/obras');
}

test('deve listar as obras com recebido e saldo quando o admin abre a página', async ({ page }) => {
  await abrirObras(page);

  await expect(page.getByRole('heading', { name: 'Obras', level: 1 })).toBeVisible();
  await expect(page.getByText('2 obras')).toBeVisible();
  await expect(
    page.getByText(/Total R\$\s10\.000,00 · Recebido R\$\s4\.000,00 · Saldo R\$\s6\.000,00/),
  ).toBeVisible();
  await semRolagemHorizontal(page);
});

test('deve mostrar só as obras do status escolhido quando o admin filtra', async ({ page }) => {
  await abrirObras(page);

  await page.getByLabel('Filtrar por status').selectOption('Concluído');

  await expect(page.getByRole('button', { name: 'Editar: Cozinha planejada' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Editar: Painel ripado na sala' })).toHaveCount(0);
});

test('deve registrar o saldo inteiro quando o admin quita a obra', async ({ page }) => {
  await abrirObras(page);
  let corpo: unknown;
  await page.route(URL_RECEBIMENTO, async (rota) => {
    corpo = rota.request().postDataJSON();
    await rota.fulfill({ status: 204, body: '' });
  });

  await page.getByRole('button', { name: 'Quitar saldo: Painel ripado na sala' }).click();

  await expect.poll(() => corpo).toEqual({ p_obra_id: 1, p_valor: 6000 });
  await expect(page.getByRole('button', { name: /Quitar saldo: Cozinha/ })).toHaveCount(0);
});

test('deve enviar a ficha e a entrada inicial quando o admin cria uma obra', async ({ page }) => {
  await entrarComoAdmin(page);
  let ficha: unknown;
  let entrada: unknown;
  await page.route(URL_RESUMO, (rota) => responderJson(rota, OBRAS));
  await page.route(URL_CLIENTES, (rota) => responderJson(rota, CLIENTES));
  await page.route(URL_SERVICOS, async (rota) => {
    ficha = rota.request().postDataJSON();
    await responderJson(rota, { id: 9 }, 201);
  });
  await page.route(URL_DEFINIR, async (rota) => {
    entrada = rota.request().postDataJSON();
    await rota.fulfill({ status: 204, body: '' });
  });
  await page.goto('/admin/#/obras');

  await page.getByRole('button', { name: 'Nova obra' }).click();
  await page.getByLabel('Cliente').selectOption('1');
  await page.getByLabel('Descrição da obra').fill('Closet casal');
  await page.getByLabel('Valor total (R$)').fill('R$ 8.000,00');
  await page.getByLabel('Entrada inicial (R$, opcional)').fill('2.500,00');
  await page.getByRole('button', { name: 'Criar ficha de obra' }).click();

  await expect
    .poll(() => ficha)
    .toMatchObject({ client_id: 1, descricao: 'Closet casal', valor_total: 8000 });
  await expect.poll(() => entrada).toEqual({ p_obra_id: 9, p_valor: 2500 });
});

test('deve avisar e não enviar quando a entrada passa do valor total', async ({ page }) => {
  await abrirObras(page);
  let enviou = false;
  await page.route(URL_SERVICOS, async (rota) => {
    enviou = true;
    await rota.fulfill({ status: 201, body: '' });
  });

  await page.getByRole('button', { name: 'Nova obra' }).click();
  await page.getByLabel('Cliente').selectOption('1');
  await page.getByLabel('Descrição da obra').fill('Closet casal');
  await page.getByLabel('Valor total (R$)').fill('1000');
  await page.getByLabel('Entrada inicial (R$, opcional)').fill('1500');
  await page.getByRole('button', { name: 'Criar ficha de obra' }).click();

  await expect(page.getByRole('alert')).toContainText('A entrada não pode passar do valor total');
  expect(enviou).toBe(false);
});

test('deve avisar quanto sai do caixa quando o admin vai excluir uma obra com recebimentos', async ({
  page,
}) => {
  await abrirObras(page);

  await page.getByRole('button', { name: 'Excluir: Painel ripado na sala' }).click();

  await expect(page.getByRole('dialog')).toContainText(/R\$\s4\.000,00 já recebidos/);
});

test('deve mostrar contratado e pago do cliente quando ele tem obras e entradas', async ({
  page,
}) => {
  await entrarComoAdmin(page);
  await page.route(URL_CLIENTES, (rota) =>
    responderJson(rota, [
      {
        id: 1,
        codigo: 'CLI-0001',
        nome: 'Maria Souza',
        telefone: '61999991234',
        cpf: null,
        endereco: null,
        obs: null,
        lead_id: null,
        created_at: '2026-10-28T12:00:00Z',
        updated_at: '2026-10-28T12:00:00Z',
      },
    ]),
  );
  await page.route(URL_SERVICOS, (rota) =>
    responderJson(rota, [
      { client_id: 1, valor_total: 10000 },
      { client_id: 1, valor_total: 2500.5 },
    ]),
  );
  await page.route(URL_TRANSACOES, (rota) =>
    responderJson(rota, [
      { client_id: 1, tipo: 'entrada', valor: 4000 },
      { client_id: 1, tipo: 'entrada', valor: 500.25 },
    ]),
  );
  await page.goto('/admin/#/clientes');

  await expect(page.getByText(/Contratado R\$\s12\.500,50 · Pago R\$\s4\.500,25/)).toBeVisible();
});
