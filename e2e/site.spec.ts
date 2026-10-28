import { expect, test, type Page } from '@playwright/test';
import { semRolagemHorizontal, servirImagensFalsas, SUPABASE } from './apoio';

const URL_LEADS = `${SUPABASE}/rest/v1/leads*`;

// A maioria dos cenários não trata de cookies: registra a escolha antes, para o banner não atrapalhar.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('dk_consentimento', 'recusado'));
  await servirImagensFalsas(page);
});

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
  await expect(
    page.getByRole('heading', { level: 1, name: /Madeira trabalhada sob medida/ }),
  ).toBeVisible();
  await semRolagemHorizontal(page);
});

test('deve ter texto alternativo e dimensões em todas as imagens quando a home carrega', async ({
  page,
}) => {
  await page.goto('/');
  const problemas = await page.evaluate(() =>
    [...document.querySelectorAll('img')]
      .filter(
        (img) =>
          !img.getAttribute('alt') || !img.getAttribute('width') || !img.getAttribute('height'),
      )
      .map((img) => img.currentSrc || img.src),
  );
  expect(problemas, 'imagens sem alt/width/height').toEqual([]);
});

test('deve priorizar o carregamento da foto do topo quando a home abre', async ({ page }) => {
  await page.goto('/');
  const foto = page.locator('main section').first().locator('img');
  await expect(foto).toHaveAttribute('fetchpriority', 'high');
  await expect(foto).not.toHaveAttribute('loading', 'lazy');
});

test('deve mostrar só os trabalhos da categoria quando o visitante filtra o portfólio', async ({
  page,
}) => {
  await page.goto('/');
  const itens = page.locator('#portfolio [data-item]:not([hidden])');
  await expect(itens).toHaveCount(14);

  await page.getByRole('button', { name: 'Áreas externas' }).click();
  await expect(itens).toHaveCount(5);
  await expect(page.getByRole('button', { name: 'Áreas externas' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.getByRole('button', { name: 'Todos' }).click();
  await expect(itens).toHaveCount(14);
});

test('deve ampliar a foto e fechar com Esc quando o visitante abre um trabalho', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ampliar a foto: Estante em escada' }).click();

  const janela = page.getByRole('dialog', { name: 'Estante em escada' });
  await expect(janela).toBeVisible();
  await expect(janela.getByRole('img')).toBeVisible();
  await expect(janela.getByRole('link', { name: 'Pedir orçamento' })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(janela).toBeHidden();
});

test('deve tocar o vídeo e parar ao fechar quando o visitante abre um vídeo', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Assistir ao vídeo: Escrivaninha/ }).click();

  const janela = page.getByRole('dialog', { name: 'Escrivaninha com gavetas' });
  await expect(janela.locator('video')).toBeVisible();

  await janela.getByRole('button', { name: 'Fechar' }).click();
  await expect(janela).toBeHidden();
  // A mídia é removida ao fechar (o que também para o vídeo).
  await expect(page.locator('#lightbox-midia *')).toHaveCount(0);
});

test('deve mostrar a barra de ações só no celular, fora do topo e do formulário', async ({
  page,
}, info) => {
  await page.goto('/');
  const barra = page.locator('#barra-cta');
  const largura = info.project.use.viewport?.width ?? 0;

  if (largura >= 768) {
    await expect(barra).toBeHidden();
    return;
  }
  // No topo ela fica escondida (o topo já tem os mesmos botões).
  await expect(barra).toHaveAttribute('inert', '');
  // No meio da página, aparece.
  await page.locator('#servicos').scrollIntoViewIfNeeded();
  await expect(barra).not.toHaveAttribute('inert', '');
  // No formulário, some de novo.
  await page.locator('#orcamento').scrollIntoViewIfNeeded();
  await expect(barra).toHaveAttribute('inert', '');
});

test('deve oferecer a navegação do jeito certo quando a tela muda de tamanho', async ({
  page,
}, info) => {
  await page.goto('/');
  const largura = info.project.use.viewport?.width ?? 0;

  if (largura < 768) {
    await page.getByText('Menu', { exact: true }).click();
    await expect(page.getByRole('link', { name: 'Portfólio' })).toBeVisible();
  } else {
    await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible();
    await expect(page.getByText('Menu', { exact: true })).toBeHidden();
  }
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

test('deve montar as imagens do portfólio com srcset, dimensões e blur quando os itens vêm do banco', async ({
  page,
}) => {
  await page.goto('/');
  const primeira = page.locator('#portfolio [data-item] img').first();

  await expect(primeira).toHaveAttribute(
    'srcset',
    /\/storage\/v1\/object\/public\/portfolio\/itens\/.+-480\.webp 480w, .+-960\.webp 960w/,
  );
  await expect(primeira).toHaveAttribute('width', '1280');
  await expect(primeira).toHaveAttribute('height', '960');
  await expect(primeira).toHaveAttribute('loading', 'lazy');
  await expect(primeira).toHaveAttribute('style', /background-image:url\(data:image\/webp/);
});

test('deve mostrar a seção de depoimentos com as imagens quando há depoimentos visíveis', async ({
  page,
}) => {
  await page.goto('/');

  const secao = page.locator('#depoimentos');
  await expect(secao.getByRole('heading', { name: 'O que dizem nossos clientes' })).toBeVisible();
  await expect(secao.locator('img')).toHaveCount(2);
  await expect(secao.getByRole('button', { name: 'Ampliar: Depoimento de Maria' })).toBeVisible();
  await expect(secao.getByRole('button', { name: 'Ampliar: Depoimento de cliente' })).toBeVisible();
  await expect(secao.getByText('Deck na beira do lago')).toBeVisible();

  // Imagens com texto alternativo e dimensões (sem salto de layout).
  const primeiraImagem = secao.locator('img').first();
  await expect(primeiraImagem).toHaveAttribute('alt', /Depoimento de Maria/);
  await expect(primeiraImagem).toHaveAttribute('width', '960');
  await expect(primeiraImagem).toHaveAttribute('height', '1700');
  await semRolagemHorizontal(page);
});

test('deve ampliar o depoimento quando o visitante clica na imagem', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ampliar: Depoimento de Maria' }).click();

  const janela = page.getByRole('dialog', { name: 'Depoimento de Maria' });
  await expect(janela).toBeVisible();
  await expect(janela.getByRole('img')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(janela).toBeHidden();
});
