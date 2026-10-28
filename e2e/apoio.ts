import { expect, type Page, type Route } from '@playwright/test';

/** Mesmo valor de scripts/build-e2e.mjs: o build de teste aponta para este endereço falso. */
export const SUPABASE = 'https://e2e.supabase.co';
/** O supabase-js guarda a sessão em `sb-<primeiro-trecho-do-host>-auth-token`. */
const CHAVE_SESSAO = 'sb-e2e-auth-token';

/** Falha se a página rola na horizontal (algo vazando da tela). */
export async function semRolagemHorizontal(page: Page) {
  const excesso = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(excesso, 'a página não deve rolar na horizontal').toBeLessThanOrEqual(0);
}

/** Gera um PNG de cor única no próprio navegador (não precisa de arquivos de teste no repositório). */
export async function gerarPng(
  page: Page,
  largura: number,
  altura: number,
  cor = '#c28340',
): Promise<Buffer> {
  const base64 = await page.evaluate(
    ([l, a, c]) => {
      const canvas = document.createElement('canvas');
      canvas.width = l as number;
      canvas.height = a as number;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = c as string;
      ctx.fillRect(0, 0, l as number, a as number);
      return canvas.toDataURL('image/png').split(',')[1]!;
    },
    [largura, altura, cor] as const,
  );
  return Buffer.from(base64, 'base64');
}

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

/**
 * O build de teste aponta as mídias para o Supabase falso. Aqui elas "existem": toda imagem pública
 * do Storage responde com um PNG de 1 pixel (para o navegador tratar como imagem carregada).
 */
export async function servirImagensFalsas(page: Page) {
  await page.route(`${SUPABASE}/storage/v1/object/public/**`, (rota) =>
    rota.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 }),
  );
}

/** O Storage recebe multipart: extrai os bytes do WebP (cabeçalho RIFF traz o tamanho do arquivo). */
export function extrairWebp(corpo: Buffer): Buffer {
  const inicio = corpo.indexOf('RIFF');
  if (inicio === -1) throw new Error('Nenhum WebP encontrado no corpo do envio');
  const tamanho = corpo.readUInt32LE(inicio + 4);
  return corpo.subarray(inicio, inicio + 8 + tamanho);
}

/** Lê a cor de um pixel (frações da imagem) de um WebP, decodificando no navegador. */
export async function corDoPixel(
  page: Page,
  webp: Buffer,
  fx: number,
  fy: number,
): Promise<[number, number, number]> {
  return page.evaluate(
    async ([base64, x, y]) => {
      const bytes = Uint8Array.from(atob(base64 as string), (c) => c.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/webp' }));
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(bitmap, 0, 0);
      const [r, g, b] = ctx.getImageData(
        Math.floor((x as number) * bitmap.width),
        Math.floor((y as number) * bitmap.height),
        1,
        1,
      ).data;
      return [r!, g!, b!] as [number, number, number];
    },
    [webp.toString('base64'), fx, fy] as const,
  );
}

function codificar(objeto: object): string {
  return Buffer.from(JSON.stringify(objeto)).toString('base64url');
}

/** Simula um admin logado (sessão no localStorage + resposta de is_admin). Nada vai ao Supabase real. */
export async function entrarComoAdmin(page: Page) {
  const expira = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
  const usuario = {
    id: '00000000-0000-0000-0000-000000000001',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'admin@teste.local',
    app_metadata: {},
    user_metadata: {},
    created_at: '2026-01-01T00:00:00Z',
  };
  const sessao = {
    access_token: `${codificar({ alg: 'HS256', typ: 'JWT' })}.${codificar({ sub: usuario.id, exp: expira, role: 'authenticated' })}.assinatura`,
    token_type: 'bearer',
    expires_in: 86400,
    expires_at: expira,
    refresh_token: 'refresh-e2e',
    user: usuario,
  };
  await page.addInitScript(
    ([chave, valor]) => window.localStorage.setItem(chave as string, valor as string),
    [CHAVE_SESSAO, JSON.stringify(sessao)],
  );
  await page.route(`${SUPABASE}/rest/v1/rpc/is_admin`, (rota) => rota.fulfill({ json: true }));
}

export function responderJson(rota: Route, corpo: unknown, status = 200) {
  return rota.fulfill({ status, contentType: 'application/json', body: JSON.stringify(corpo) });
}
