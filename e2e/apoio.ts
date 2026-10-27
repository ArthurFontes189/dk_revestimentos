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
