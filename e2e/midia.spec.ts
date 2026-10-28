import { expect, test, type Page, type Request } from '@playwright/test';
import {
  corDoPixel,
  entrarComoAdmin,
  extrairWebp,
  gerarPng,
  responderJson,
  SUPABASE,
} from './apoio';

/** Tudo é simulado: nenhum arquivo ou linha chega ao Supabase real. */
interface Capturas {
  uploads: Request[];
  remocoes: unknown[];
  inserts: Record<string, unknown>[];
  patches: { url: string; corpo: unknown }[];
  deletes: string[];
}

async function simularBanco(page: Page, tabela: string, linhas: unknown[] = []): Promise<Capturas> {
  const c: Capturas = { uploads: [], remocoes: [], inserts: [], patches: [], deletes: [] };

  await page.route(`${SUPABASE}/storage/v1/**`, async (rota) => {
    const pedido = rota.request();
    if (pedido.method() === 'POST') {
      c.uploads.push(pedido);
      await responderJson(rota, { Key: 'ok', Id: 'ok' });
    } else if (pedido.method() === 'DELETE') {
      c.remocoes.push(pedido.postDataJSON());
      await responderJson(rota, []);
    } else {
      await rota.fulfill({ status: 200, body: '' });
    }
  });

  await page.route(`${SUPABASE}/rest/v1/${tabela}*`, async (rota) => {
    const pedido = rota.request();
    switch (pedido.method()) {
      case 'POST':
        c.inserts.push(pedido.postDataJSON() as Record<string, unknown>);
        return rota.fulfill({ status: 201, body: '' });
      case 'PATCH':
        c.patches.push({ url: pedido.url(), corpo: pedido.postDataJSON() });
        return rota.fulfill({ status: 204, body: '' });
      case 'DELETE':
        c.deletes.push(pedido.url());
        return rota.fulfill({ status: 204, body: '' });
      default:
        return responderJson(rota, linhas);
    }
  });
  return c;
}

function item(id: string, titulo: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    titulo,
    descricao: '',
    categoria: 'MARCENARIA',
    tipo: 'foto',
    imagem_base: `itens/${id}`,
    larguras: [480, 960],
    largura_original: 1280,
    altura_original: 960,
    blur: null,
    video_path: null,
    destaque: false,
    publicado: true,
    ordem: 0,
    created_at: '2026-10-27T12:00:00Z',
    updated_at: '2026-10-27T12:00:00Z',
    ...extra,
  };
}

test.beforeEach(async ({ page }) => {
  await entrarComoAdmin(page);
});

test('deve otimizar e enviar as variantes WebP quando o admin cria um item com foto', async ({
  page,
}) => {
  const c = await simularBanco(page, 'portfolio_items', []);
  await page.goto('/admin/#/portfolio');
  const png = await gerarPng(page, 1300, 800);

  await page.getByRole('button', { name: 'Novo item' }).click();
  await page
    .locator('#arquivo-item')
    .setInputFiles({ name: 'deck.png', mimeType: 'image/png', buffer: png });
  await page.getByLabel('Título').fill('Deck de teste');
  await page.getByRole('button', { name: 'Adicionar ao portfólio' }).click();

  // 1300 px de largura: 480, 960 e a própria largura original (sem ampliar nada).
  await expect.poll(() => c.uploads.length).toBe(3);
  const caminhos = c.uploads.map((u) => new URL(u.url()).pathname);
  expect(caminhos.some((p) => p.endsWith('-480.webp'))).toBe(true);
  expect(caminhos.some((p) => p.endsWith('-960.webp'))).toBe(true);
  expect(caminhos.some((p) => p.endsWith('-1300.webp'))).toBe(true);
  for (const upload of c.uploads) {
    expect(extrairWebp(upload.postDataBuffer()!).subarray(8, 12).toString()).toBe('WEBP');
  }

  await expect.poll(() => c.inserts.length).toBe(1);
  expect(c.inserts[0]).toMatchObject({
    titulo: 'Deck de teste',
    categoria: 'MARCENARIA',
    tipo: 'foto',
    larguras: [480, 960, 1300],
    largura_original: 1300,
    altura_original: 800,
    ordem: 0,
    video_path: null,
  });
  expect(String(c.inserts[0]!.imagem_base)).toMatch(/^itens\/[0-9a-f]{16}$/);
  expect(String(c.inserts[0]!.blur)).toMatch(/^data:image\/webp/);
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('deve recusar o envio quando o formato do arquivo não é suportado', async ({ page }) => {
  const c = await simularBanco(page, 'portfolio_items', []);
  await page.goto('/admin/#/portfolio');

  await page.getByRole('button', { name: 'Novo item' }).click();
  await page.locator('#arquivo-item').setInputFiles({
    name: 'animacao.gif',
    mimeType: 'image/gif',
    buffer: Buffer.from('GIF89a'),
  });
  await page.getByLabel('Título').fill('Item inválido');
  await page.getByRole('button', { name: 'Adicionar ao portfólio' }).click();

  await expect(page.getByRole('alert')).toContainText('Formato não suportado');
  expect(c.uploads).toHaveLength(0);
  expect(c.inserts).toHaveLength(0);
});

test('deve pedir o título e a mídia quando o formulário está vazio', async ({ page }) => {
  await simularBanco(page, 'portfolio_items', []);
  await page.goto('/admin/#/portfolio');

  await page.getByRole('button', { name: 'Novo item' }).click();
  await page.getByRole('button', { name: 'Adicionar ao portfólio' }).click();
  await expect(page.getByRole('alert')).toContainText('Informe o título');

  await page.getByLabel('Título').fill('Só o título');
  await page.getByRole('button', { name: 'Adicionar ao portfólio' }).click();
  await expect(page.getByRole('alert')).toContainText('Escolha uma foto ou um vídeo');
});

test('deve renumerar a ordem de todos os itens quando o admin desce um item', async ({ page }) => {
  const c = await simularBanco(page, 'portfolio_items', [
    item('aaa', 'Primeiro'),
    item('bbb', 'Segundo'),
  ]);
  await page.goto('/admin/#/portfolio');

  await page.getByRole('button', { name: 'Descer: Primeiro' }).click();

  await expect.poll(() => c.patches.length).toBe(2);
  const porId = Object.fromEntries(
    c.patches.map((p) => [new URL(p.url).searchParams.get('id'), p.corpo]),
  );
  expect(porId['eq.bbb']).toEqual({ ordem: 0 });
  expect(porId['eq.aaa']).toEqual({ ordem: 1 });
});

test('deve ocultar o item do site quando o admin clica em ocultar', async ({ page }) => {
  const c = await simularBanco(page, 'portfolio_items', [item('aaa', 'Primeiro')]);
  await page.goto('/admin/#/portfolio');

  await page.getByRole('button', { name: 'Ocultar: Primeiro' }).click();

  await expect.poll(() => c.patches.length).toBe(1);
  expect(c.patches[0]!.corpo).toEqual({ publicado: false });
});

test('deve apagar a linha e os arquivos do Storage quando o admin confirma a exclusão', async ({
  page,
}) => {
  const c = await simularBanco(page, 'portfolio_items', [
    item('aaa', 'Vídeo antigo', {
      tipo: 'video',
      video_path: 'itens/aaa.mp4',
      larguras: [480, 576],
    }),
  ]);
  await page.goto('/admin/#/portfolio');

  await page.getByRole('button', { name: 'Excluir: Vídeo antigo' }).click();
  await expect(page.getByRole('dialog', { name: 'Excluir item?' })).toBeVisible();
  await page.getByRole('button', { name: 'Excluir definitivamente' }).click();

  await expect.poll(() => c.deletes.length).toBe(1);
  await expect.poll(() => c.remocoes.length).toBe(1);
  expect(c.remocoes[0]).toEqual({
    prefixes: ['itens/aaa-480.webp', 'itens/aaa-576.webp', 'itens/aaa.mp4'],
  });
});

test('deve pintar de preto a área escolhida no arquivo enviado quando o admin usa a tarja', async ({
  page,
}) => {
  const c = await simularBanco(page, 'testimonials', []);
  await page.goto('/admin/#/depoimentos');
  const branco = await gerarPng(page, 600, 900, '#ffffff');

  await page.getByLabel('Escolher imagens de depoimentos').setInputFiles({
    name: 'print.png',
    mimeType: 'image/png',
    buffer: branco,
  });
  await expect(page.getByRole('dialog', { name: 'Depoimento 1 de 1' })).toBeVisible();

  // Arrasta do ponto (25%, 25%) ao (75%, 50%) da imagem.
  const area = page.getByRole('img', { name: /Imagem do depoimento/ });
  const caixa = (await area.boundingBox())!;
  await page.mouse.move(caixa.x + caixa.width * 0.25, caixa.y + caixa.height * 0.25);
  await page.mouse.down();
  await page.mouse.move(caixa.x + caixa.width * 0.5, caixa.y + caixa.height * 0.4, { steps: 4 });
  await page.mouse.move(caixa.x + caixa.width * 0.75, caixa.y + caixa.height * 0.5, { steps: 4 });
  await page.mouse.up();
  await expect(page.locator('[data-tarja]')).toHaveCount(1);

  await page.getByRole('button', { name: 'Enviar com tarja' }).click();
  await expect.poll(() => c.uploads.length).toBe(2); // 480 e 600 (sem ampliar)
  const grande = c.uploads.find((u) => new URL(u.url()).pathname.endsWith('-600.webp'))!;
  const webp = extrairWebp(grande.postDataBuffer()!);

  const [rd, gd, bd] = await corDoPixel(page, webp, 0.5, 0.375); // dentro da tarja
  const [rf, gf, bf] = await corDoPixel(page, webp, 0.1, 0.1); // fora da tarja
  expect(Math.max(rd, gd, bd), 'dentro da tarja deve ser preto').toBeLessThan(30);
  expect(Math.min(rf, gf, bf), 'fora da tarja deve continuar branco').toBeGreaterThan(225);

  await expect.poll(() => c.inserts.length).toBe(1);
  expect(c.inserts[0]).toMatchObject({ largura_original: 600, altura_original: 900, ordem: 0 });
});

test('deve avançar para a próxima imagem sem enviar nada quando o admin pula', async ({ page }) => {
  const c = await simularBanco(page, 'testimonials', []);
  await page.goto('/admin/#/depoimentos');
  const [a, b] = await Promise.all([
    gerarPng(page, 600, 600, '#ff0000'),
    gerarPng(page, 600, 600, '#00ff00'),
  ]);

  await page.getByLabel('Escolher imagens de depoimentos').setInputFiles([
    { name: 'um.png', mimeType: 'image/png', buffer: a },
    { name: 'dois.png', mimeType: 'image/png', buffer: b },
  ]);
  await expect(page.getByRole('dialog', { name: 'Depoimento 1 de 2' })).toBeVisible();

  await page.getByRole('button', { name: 'Pular esta imagem' }).click();
  await expect(page.getByRole('dialog', { name: 'Depoimento 2 de 2' })).toBeVisible();
  await page.getByRole('button', { name: 'Pular esta imagem' }).click();

  await expect(page.getByRole('dialog')).toBeHidden();
  expect(c.uploads).toHaveLength(0);
  expect(c.inserts).toHaveLength(0);
});

test('deve limpar nome e legenda no banco quando o admin apaga os campos', async ({ page }) => {
  const c = await simularBanco(page, 'testimonials', [
    {
      id: 'ddd',
      imagem_base: 'prints/ddd',
      larguras: [480],
      largura_original: 480,
      altura_original: 900,
      blur: null,
      nome: 'Maria',
      legenda: 'Cozinha',
      ordem: 0,
      visivel: true,
      created_at: '2026-10-27T12:00:00Z',
      updated_at: '2026-10-27T12:00:00Z',
    },
  ]);
  await page.goto('/admin/#/depoimentos');

  await page.getByRole('button', { name: 'Editar depoimento 1' }).click();
  await page.getByLabel('Primeiro nome (opcional)').fill('');
  await page.getByLabel('Projeto ou cidade (opcional)').fill('');
  await page.getByRole('button', { name: 'Salvar' }).click();

  await expect.poll(() => c.patches.length).toBe(1);
  expect(c.patches[0]!.corpo).toEqual({ nome: null, legenda: null });
});
