import { expect, test, type Page } from '@playwright/test';
import { entrarComoAdmin, responderJson, semRolagemHorizontal, SUPABASE } from './apoio';

const URL_CLIENTES = `${SUPABASE}/rest/v1/clients*`;
const URL_LEADS = `${SUPABASE}/rest/v1/leads*`;
const URL_CONVERTER = `${SUPABASE}/rest/v1/rpc/converter_lead`;

function cliente(id: number, nome: string, telefone: string, cpf: string | null) {
  return {
    id,
    codigo: `CLI-${String(id).padStart(4, '0')}`,
    nome,
    telefone,
    cpf,
    endereco: null,
    obs: null,
    lead_id: null,
    created_at: '2026-10-28T12:00:00Z',
    updated_at: '2026-10-28T12:00:00Z',
  };
}

const CLIENTES = [
  cliente(1, 'Maria Souza', '61999991234', '52998224725'),
  cliente(2, 'João Álvares', '61988887777', null),
];

function lead(id: number, nome: string, status: string) {
  return {
    id,
    nome,
    telefone: '61999991234',
    bairro: null,
    tipo_servico: 'Marcenaria Sob Medida',
    mensagem: null,
    status,
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    fbclid: null,
    pagina_entrada: '/',
    created_at: '2026-10-27T12:00:00Z',
    updated_at: '2026-10-27T12:00:00Z',
  };
}

const LEADS = [lead(1, 'Maria Souza', 'Em Negociação'), lead(2, 'Ana Costa', 'Fechado')];

async function abrirClientes(page: Page) {
  await entrarComoAdmin(page);
  await page.route(URL_CLIENTES, (rota) => responderJson(rota, CLIENTES));
  await page.goto('/admin/#/clientes');
}

test('deve listar os clientes com código e telefone formatado quando o admin abre a página', async ({
  page,
}) => {
  await abrirClientes(page);

  await expect(page.getByRole('heading', { name: 'Clientes', level: 1 })).toBeVisible();
  await expect(page.getByText('2 clientes')).toBeVisible();
  await expect(page.getByText('CLI-0001')).toBeVisible();
  await expect(page.getByText(/\(61\) 99999-1234 · CPF 529\.982\.247-25/)).toBeVisible();
  await semRolagemHorizontal(page);
});

test('deve filtrar a lista quando o admin busca sem acento', async ({ page }) => {
  await abrirClientes(page);

  await page.getByLabel('Buscar por nome, telefone, CPF ou código').fill('joao alvares');

  await expect(page.getByRole('button', { name: 'Editar: João Álvares' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Editar: Maria Souza' })).toHaveCount(0);
});

test('deve enviar os dados normalizados ao banco quando o admin cadastra um cliente', async ({
  page,
}) => {
  await entrarComoAdmin(page);
  let criado: unknown;
  await page.route(URL_CLIENTES, async (rota) => {
    if (rota.request().method() === 'POST') {
      criado = rota.request().postDataJSON();
      await rota.fulfill({ status: 201, body: '' });
      return;
    }
    await responderJson(rota, CLIENTES);
  });
  await page.goto('/admin/#/clientes');

  await page.getByRole('button', { name: 'Novo cliente' }).click();
  await page.getByLabel('Nome', { exact: true }).fill('Carla Dias');
  await page.getByLabel('Telefone (WhatsApp)').fill('+55 (61) 97777-6666');
  await page.getByLabel('CPF (opcional)').fill('529.982.247-25');
  await page.getByRole('button', { name: 'Cadastrar cliente' }).click();

  await expect
    .poll(() => criado)
    .toEqual({
      nome: 'Carla Dias',
      telefone: '61977776666',
      cpf: '52998224725',
      endereco: null,
      obs: null,
    });
  await expect(page.getByRole('button', { name: 'Cadastrar cliente' })).toHaveCount(0);
});

test('deve avisar e não enviar quando o CPF digitado é inválido', async ({ page }) => {
  await entrarComoAdmin(page);
  let enviou = false;
  await page.route(URL_CLIENTES, async (rota) => {
    if (rota.request().method() === 'POST') enviou = true;
    await responderJson(rota, CLIENTES);
  });
  await page.goto('/admin/#/clientes');

  await page.getByRole('button', { name: 'Novo cliente' }).click();
  await page.getByLabel('Nome', { exact: true }).fill('Carla Dias');
  await page.getByLabel('Telefone (WhatsApp)').fill('61977776666');
  await page.getByLabel('CPF (opcional)').fill('111.111.111-11');
  await page.getByRole('button', { name: 'Cadastrar cliente' }).click();

  await expect(page.getByRole('alert')).toHaveText('CPF inválido');
  expect(enviou).toBe(false);
});

test('deve explicar o erro quando o telefone já pertence a outro cliente', async ({ page }) => {
  await entrarComoAdmin(page);
  await page.route(URL_CLIENTES, async (rota) => {
    if (rota.request().method() === 'POST') {
      await responderJson(
        rota,
        {
          code: '23505',
          message: 'duplicate key value violates unique constraint "clients_telefone_key"',
        },
        409,
      );
      return;
    }
    await responderJson(rota, CLIENTES);
  });
  await page.goto('/admin/#/clientes');

  await page.getByRole('button', { name: 'Novo cliente' }).click();
  await page.getByLabel('Nome', { exact: true }).fill('Outra Maria');
  await page.getByLabel('Telefone (WhatsApp)').fill('61999991234');
  await page.getByRole('button', { name: 'Cadastrar cliente' }).click();

  await expect(page.getByRole('alert')).toHaveText('Já existe um cliente com este telefone.');
});

test('deve converter o lead em cliente quando o admin clica em converter', async ({ page }) => {
  await entrarComoAdmin(page);
  let chamada: unknown;
  await page.route(URL_LEADS, (rota) => responderJson(rota, LEADS));
  await page.route(URL_CONVERTER, async (rota) => {
    chamada = rota.request().postDataJSON();
    await responderJson(rota, [{ cliente_id: 1, codigo: 'CLI-0001', cliente_novo: true }]);
  });
  await page.goto('/admin/#/leads');

  await page.getByRole('button', { name: /Maria Souza/ }).click();
  await page.getByRole('button', { name: 'Converter em cliente' }).click();

  await expect.poll(() => chamada).toEqual({ p_lead_id: 1 });
  await expect(page.getByRole('status')).toContainText(
    'Cliente CLI-0001 cadastrado e lead fechado.',
  );
});

test('deve enviar a obra junto com a conversão quando o admin converte e cria a ficha', async ({
  page,
}) => {
  await entrarComoAdmin(page);
  let chamada: unknown;
  await page.route(URL_LEADS, (rota) => responderJson(rota, LEADS));
  await page.route(URL_CONVERTER, async (rota) => {
    chamada = rota.request().postDataJSON();
    await responderJson(rota, [
      { cliente_id: 1, codigo: 'CLI-0001', cliente_novo: true, obra_id: 5 },
    ]);
  });
  await page.goto('/admin/#/leads');

  await page.getByRole('button', { name: /Maria Souza/ }).click();
  await page.getByRole('button', { name: 'Converter e criar obra' }).click();
  await page.getByLabel('Valor total (R$)').fill('8.000,00');
  await page.getByLabel('Entrada inicial (R$, opcional)').fill('2.000,00');
  await page.getByRole('button', { name: 'Converter e criar obra' }).last().click();

  await expect
    .poll(() => chamada)
    .toMatchObject({
      p_lead_id: 1,
      p_obra: {
        descricao: 'Marcenaria Sob Medida',
        valor_total: 8000,
        valor_entrada: 2000,
        status: 'A Iniciar',
      },
    });
  await expect(page.getByRole('status')).toContainText('Ficha de obra criada.');
});

test('deve avisar e não converter quando a entrada da obra passa do valor total', async ({
  page,
}) => {
  await entrarComoAdmin(page);
  let chamou = false;
  await page.route(URL_LEADS, (rota) => responderJson(rota, LEADS));
  await page.route(URL_CONVERTER, async (rota) => {
    chamou = true;
    await rota.fulfill({ status: 204, body: '' });
  });
  await page.goto('/admin/#/leads');

  await page.getByRole('button', { name: /Maria Souza/ }).click();
  await page.getByRole('button', { name: 'Converter e criar obra' }).click();
  await page.getByLabel('Valor total (R$)').fill('1000');
  await page.getByLabel('Entrada inicial (R$, opcional)').fill('1500');
  await page.getByRole('button', { name: 'Converter e criar obra' }).last().click();

  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'A entrada não pode passar do valor total',
  );
  expect(chamou).toBe(false);
});

test('deve avisar que o telefone já era cliente quando a conversão reaproveita o cadastro', async ({
  page,
}) => {
  await entrarComoAdmin(page);
  await page.route(URL_LEADS, (rota) => responderJson(rota, LEADS));
  await page.route(URL_CONVERTER, (rota) =>
    responderJson(rota, [{ cliente_id: 1, codigo: 'CLI-0001', cliente_novo: false }]),
  );
  await page.goto('/admin/#/leads');

  await page.getByRole('button', { name: /Maria Souza/ }).click();
  await page.getByRole('button', { name: 'Converter em cliente' }).click();

  await expect(page.getByRole('status')).toContainText(
    'Este telefone já era do cliente CLI-0001. Lead fechado.',
  );
});

test('deve mostrar o erro do banco quando a conversão falha', async ({ page }) => {
  await entrarComoAdmin(page);
  await page.route(URL_LEADS, (rota) => responderJson(rota, LEADS));
  await page.route(URL_CONVERTER, (rota) =>
    responderJson(rota, { code: 'P0001', message: 'lead já convertido' }, 400),
  );
  await page.goto('/admin/#/leads');

  await page.getByRole('button', { name: /Maria Souza/ }).click();
  await page.getByRole('button', { name: 'Converter em cliente' }).click();

  await expect(page.getByRole('alert')).toHaveText(
    'Não foi possível converter: lead já convertido',
  );
});

test('deve esconder o botão de converter quando o lead já está fechado', async ({ page }) => {
  await entrarComoAdmin(page);
  await page.route(URL_LEADS, (rota) => responderJson(rota, LEADS));
  await page.goto('/admin/#/leads');

  await page.getByRole('button', { name: /Ana Costa/ }).click();

  await expect(page.getByRole('heading', { name: 'Ana Costa', level: 2 })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Converter em cliente' })).toHaveCount(0);
});
