import { expect, test, type Page } from '@playwright/test';
import { entrarComoAdmin, responderJson, semRolagemHorizontal, SUPABASE } from './apoio';

const URL_FUNCIONARIOS = `${SUPABASE}/rest/v1/employees*`;
const URL_ALOCACOES = `${SUPABASE}/rest/v1/service_workers*`;
const URL_INSUMOS = `${SUPABASE}/rest/v1/service_expenses*`;
const URL_RESUMO = `${SUPABASE}/rest/v1/obras_resumo*`;
const URL_PAGAR = `${SUPABASE}/rest/v1/rpc/marcar_diaria_paga`;
const URL_SALVAR_INSUMO = `${SUPABASE}/rest/v1/rpc/salvar_insumo`;
const URL_ENVIO_CONTRATO = `${SUPABASE}/storage/v1/object/contratos/**`;
const URL_ASSINAR_CONTRATO = `${SUPABASE}/storage/v1/object/sign/contratos/**`;

function funcionario(id: number, nome: string, ativo: boolean, contrato: string | null = null) {
  return {
    id,
    nome,
    cargo: 'Marceneiro Líder',
    telefone: '61999991234',
    chave_pix: '61999991234',
    diaria_padrao: 250,
    ativo,
    contrato_path: contrato,
    created_at: '2026-10-30T12:00:00Z',
    updated_at: '2026-10-30T12:00:00Z',
  };
}

const FUNCIONARIOS = [
  funcionario(1, 'José Ribeiro', true, '1/contrato.pdf'),
  funcionario(2, 'Pedro Alves', true),
  funcionario(3, 'Antônio Lima', false),
];

const OBRA = {
  id: 1,
  client_id: 1,
  lead_id: null,
  descricao: 'Painel ripado na sala',
  materiais: null,
  forma_pagamento: null,
  responsavel: null,
  data_entrega: null,
  valor_total: 10000,
  status: 'A Iniciar',
  concluida_em: null,
  created_at: '2026-10-29T12:00:00Z',
  updated_at: '2026-10-29T12:00:00Z',
  valor_recebido: 4000,
  saldo: 6000,
  custo_diarias: 1000,
  custo_insumos: 200,
};

const ALOCACAO = {
  id: 7,
  service_id: 1,
  employee_id: 1,
  valor_diaria: 250,
  dias_trabalhados: 4,
  total_diarias: 1000,
  pago: false,
  pago_em: null,
  employees: { nome: 'José Ribeiro', cargo: 'Marceneiro Líder' },
};

const INSUMO = {
  id: 9,
  service_id: 1,
  categoria: 'Ferragens',
  descricao: 'Dobradiças 35 mm',
  valor: 200,
  data: '2026-10-30',
  transactions: [{ id: 3 }],
};

async function abrirEquipe(page: Page) {
  await entrarComoAdmin(page);
  await page.route(URL_FUNCIONARIOS, (rota) => responderJson(rota, FUNCIONARIOS));
  await page.goto('/admin/#/equipe');
}

async function abrirDetalheDaObra(page: Page) {
  await entrarComoAdmin(page);
  await page.route(URL_RESUMO, (rota) => responderJson(rota, [OBRA]));
  await page.route(URL_FUNCIONARIOS, (rota) => responderJson(rota, FUNCIONARIOS));
  await page.route(URL_ALOCACOES, (rota) => responderJson(rota, [ALOCACAO]));
  await page.route(URL_INSUMOS, (rota) => responderJson(rota, [INSUMO]));
  await page.goto('/admin/#/obras');
  await page.getByRole('button', { name: 'Equipe e insumos: Painel ripado na sala' }).click();
}

test('deve listar só os ativos quando o admin abre a equipe', async ({ page }) => {
  await abrirEquipe(page);

  await expect(page.getByRole('heading', { name: 'Equipe', level: 1 })).toBeVisible();
  await expect(page.getByText('3 pessoas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Editar: José Ribeiro' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Editar: Antônio Lima' })).toHaveCount(0);
  await semRolagemHorizontal(page);
});

test('deve mostrar os inativos quando o admin troca o filtro', async ({ page }) => {
  await abrirEquipe(page);

  await page.getByLabel('Mostrar').selectOption('inativos');

  await expect(page.getByRole('button', { name: 'Editar: Antônio Lima' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Editar: José Ribeiro' })).toHaveCount(0);
});

test('deve enviar os dados normalizados quando o admin cadastra um funcionário', async ({
  page,
}) => {
  await entrarComoAdmin(page);
  let criado: unknown;
  await page.route(URL_FUNCIONARIOS, async (rota) => {
    if (rota.request().method() === 'POST') {
      criado = rota.request().postDataJSON();
      await responderJson(rota, { id: 10 }, 201);
      return;
    }
    await responderJson(rota, FUNCIONARIOS);
  });
  await page.goto('/admin/#/equipe');

  await page.getByRole('button', { name: 'Novo funcionário' }).click();
  await page.getByLabel('Nome', { exact: true }).fill('Carlos Souza');
  await page.getByLabel('Telefone (opcional)').fill('+55 (61) 97777-6666');
  await page.getByLabel('Diária padrão (R$)').fill('R$ 300,00');
  await page.getByRole('button', { name: 'Cadastrar funcionário' }).click();

  await expect
    .poll(() => criado)
    .toEqual({
      nome: 'Carlos Souza',
      cargo: null,
      telefone: '61977776666',
      chave_pix: null,
      diaria_padrao: 300,
      ativo: true,
    });
});

test('deve avisar e não enviar quando a diária padrão é inválida', async ({ page }) => {
  await abrirEquipe(page);
  let enviou = false;
  await page.route(URL_FUNCIONARIOS, async (rota) => {
    if (rota.request().method() === 'POST') enviou = true;
    await responderJson(rota, FUNCIONARIOS);
  });

  await page.getByRole('button', { name: 'Novo funcionário' }).click();
  await page.getByLabel('Nome', { exact: true }).fill('Carlos Souza');
  await page.getByLabel('Diária padrão (R$)').fill('abc');
  await page.getByRole('button', { name: 'Cadastrar funcionário' }).click();

  await expect(page.getByRole('alert')).toContainText('Diária inválida');
  expect(enviou).toBe(false);
});

test('deve pedir a URL assinada do contrato quando o admin clica em Ver contrato', async ({
  page,
}) => {
  await abrirEquipe(page);
  await page.route(URL_ASSINAR_CONTRATO, (rota) =>
    responderJson(rota, { signedURL: '/object/sign/contratos/1/contrato.pdf?token=abc' }),
  );
  await page
    .context()
    .route('**/object/sign/contratos/1/contrato.pdf*', (rota) =>
      rota.fulfill({ status: 200, contentType: 'text/plain', body: 'contrato' }),
    );

  const [assinatura] = await Promise.all([
    page.waitForRequest(/\/object\/sign\/contratos\/1\/contrato\.pdf/),
    page.getByRole('button', { name: 'Ver contrato: José Ribeiro', exact: true }).click(),
  ]);

  expect(assinatura.method()).toBe('POST');
  expect(assinatura.postDataJSON()).toEqual({ expiresIn: 60 });
});

test('deve enviar o contrato e guardar o caminho quando o admin anexa um PDF', async ({ page }) => {
  await entrarComoAdmin(page);
  let atualizado: unknown;
  await page.route(URL_FUNCIONARIOS, async (rota) => {
    if (rota.request().method() === 'PATCH') {
      atualizado = rota.request().postDataJSON();
      await rota.fulfill({ status: 204, body: '' });
      return;
    }
    await responderJson(rota, FUNCIONARIOS);
  });
  await page.route(URL_ENVIO_CONTRATO, (rota) => responderJson(rota, { Key: 'contratos/2/x.pdf' }));
  await page.goto('/admin/#/equipe');

  const [seletor] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Anexar contrato: Pedro Alves' }).click(),
  ]);
  await seletor.setFiles({
    name: 'contrato.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 teste'),
  });

  await expect
    .poll(() => (atualizado as { contrato_path?: string } | undefined)?.contrato_path)
    .toMatch(/^2\/[0-9a-f-]+\.pdf$/);
});

test('deve recusar o arquivo e não enviar quando o contrato não é PDF nem imagem', async ({
  page,
}) => {
  await abrirEquipe(page);
  let enviou = false;
  await page.route(URL_ENVIO_CONTRATO, async (rota) => {
    enviou = true;
    await rota.fulfill({ status: 200, body: '{}' });
  });

  const [seletor] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Anexar contrato: Pedro Alves' }).click(),
  ]);
  await seletor.setFiles({
    name: 'planilha.xlsx',
    mimeType: 'application/vnd.ms-excel',
    buffer: Buffer.from('x'),
  });

  await expect(page.getByRole('alert')).toContainText('PDF, JPG, PNG ou WebP');
  expect(enviou).toBe(false);
});

test('deve marcar a diária como paga no banco quando o admin clica em Marcar como pago', async ({
  page,
}) => {
  await abrirDetalheDaObra(page);
  let corpo: unknown;
  await page.route(URL_PAGAR, async (rota) => {
    corpo = rota.request().postDataJSON();
    await rota.fulfill({ status: 204, body: '' });
  });

  await expect(page.getByText(/R\$\s250,00 × 4 dias = R\$\s1\.000,00/)).toBeVisible();
  await page.getByRole('button', { name: 'Marcar como pago: José Ribeiro' }).click();

  await expect.poll(() => corpo).toEqual({ p_worker_id: 7, p_pago: true });
});

test('deve enviar a alocação com a diária sugerida quando o admin aloca um funcionário', async ({
  page,
}) => {
  await abrirDetalheDaObra(page);
  let alocacao: unknown;
  await page.route(URL_ALOCACOES, async (rota) => {
    if (rota.request().method() === 'POST') {
      alocacao = rota.request().postDataJSON();
      await rota.fulfill({ status: 201, body: '' });
      return;
    }
    await responderJson(rota, [ALOCACAO]);
  });

  await page.getByLabel('Funcionário').selectOption('2');
  await expect(page.getByLabel('Diária (R$)')).toHaveValue('250,00');
  await page.getByLabel('Dias trabalhados').fill('3');
  await page.getByRole('button', { name: 'Alocar na obra' }).click();

  await expect
    .poll(() => alocacao)
    .toEqual({ employee_id: 2, valor_diaria: 250, dias_trabalhados: 3, service_id: 1 });
});

test('deve lançar o insumo no caixa quando a opção está marcada', async ({ page }) => {
  await abrirDetalheDaObra(page);
  let corpo: unknown;
  await page.route(URL_SALVAR_INSUMO, async (rota) => {
    corpo = rota.request().postDataJSON();
    await responderJson(rota, 11);
  });

  await page.getByLabel('Descrição do insumo').fill('Cola PVA 5 L');
  await page.getByLabel('Valor do insumo (R$)').fill('89,90');
  await page.getByRole('button', { name: 'Adicionar insumo' }).click();

  await expect
    .poll(() => corpo)
    .toMatchObject({
      p_obra_id: 1,
      p_insumo_id: null,
      p_categoria: 'Madeiras e MDF',
      p_descricao: 'Cola PVA 5 L',
      p_valor: 89.9,
      p_lancar_no_caixa: true,
    });
});

test('deve excluir o insumo no banco quando o admin clica em Excluir', async ({ page }) => {
  await abrirDetalheDaObra(page);
  let metodo: string | undefined;
  await page.route(URL_INSUMOS, async (rota) => {
    if (rota.request().method() === 'DELETE') {
      metodo = rota.request().method();
      await rota.fulfill({ status: 204, body: '' });
      return;
    }
    await responderJson(rota, [INSUMO]);
  });

  await expect(page.getByText(/Ferragens · R\$\s200,00 · Lançado no caixa/)).toBeVisible();
  await page.getByRole('button', { name: 'Excluir insumo: Dobradiças 35 mm' }).click();

  await expect.poll(() => metodo).toBe('DELETE');
});
