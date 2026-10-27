// Build para os testes e2e: valores FICTÍCIOS, base "/" e Supabase falso (as chamadas são simuladas).
// Roda os binários pelo Node (sem `pnpm` aninhado) e depois junta site + painel em ./dist.
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '..');
const SUPABASE_FALSO = 'https://e2e.supabase.co';
const CHAVE_FALSA = 'sb_publishable_e2e';

const env = {
  ...process.env,
  BASE_PATH: '/',
  SITE_URL: 'http://127.0.0.1:4173',
  PUBLIC_WHATSAPP_NUMBER: '5561900000000',
  PUBLIC_SUPABASE_URL: SUPABASE_FALSO,
  PUBLIC_SUPABASE_PUBLISHABLE_KEY: CHAVE_FALSA,
  VITE_SUPABASE_URL: SUPABASE_FALSO,
  VITE_SUPABASE_PUBLISHABLE_KEY: CHAVE_FALSA,
  VITE_WHATSAPP_NUMBER: '5561900000000',
};

function rodar(binario, args, pasta) {
  execFileSync(process.execPath, [resolve(raiz, pasta, binario), ...args], {
    cwd: resolve(raiz, pasta),
    env,
    stdio: 'inherit',
  });
}

rodar('node_modules/astro/bin/astro.mjs', ['build'], 'apps/site');
rodar('node_modules/vite/bin/vite.js', ['build'], 'apps/admin');
execFileSync(process.execPath, [resolve(raiz, 'scripts/montar-dist.mjs')], { stdio: 'inherit' });
