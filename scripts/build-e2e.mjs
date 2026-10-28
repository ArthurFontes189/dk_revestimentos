// Build para os testes e2e: valores FICTÍCIOS, base "/" e Supabase falso (as chamadas são simuladas).
// Roda os binários pelo Node (sem `pnpm` aninhado) e depois junta site + painel em ./dist.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '..');
const SUPABASE_FALSO = 'https://e2e.supabase.co';
const CHAVE_FALSA = 'sb_publishable_e2e';

// Dados que o site "leria do banco" na publicação. São escritos num arquivo (nada de rede): o
// portfólio repete os itens iniciais, e há 2 depoimentos, um com nome e um sem.
const inicial = JSON.parse(
  readFileSync(resolve(raiz, 'apps/site/src/data/portfolio-inicial.json'), 'utf8'),
);
const agora = '2026-10-27T12:00:00Z';
const fixture = {
  portfolio_items: inicial.map((item, indice) => ({
    id: item.id,
    titulo: item.titulo,
    descricao: item.descricao,
    categoria: item.categoria,
    tipo: item.tipo,
    imagem_base: `itens/${item.id}`,
    larguras: [480, 960],
    largura_original: 1280,
    altura_original: 960,
    blur: 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4IA4AAAAwAQCdASoBAAEAAUAmJaQAA3AA/v89WAAA',
    video_path: item.tipo === 'video' ? `itens/${item.id}.mp4` : null,
    destaque: false,
    publicado: true,
    ordem: indice,
    created_at: agora,
    updated_at: agora,
  })),
  testimonials: [
    {
      id: 'dep-1',
      imagem_base: 'prints/maria',
      larguras: [480, 960],
      largura_original: 960,
      altura_original: 1700,
      blur: null,
      nome: 'Maria',
      legenda: 'Deck na beira do lago',
      ordem: 0,
      visivel: true,
      created_at: agora,
      updated_at: agora,
    },
    {
      id: 'dep-2',
      imagem_base: 'prints/anonimo',
      larguras: [480],
      largura_original: 480,
      altura_original: 900,
      blur: null,
      nome: null,
      legenda: null,
      ordem: 1,
      visivel: true,
      created_at: agora,
      updated_at: agora,
    },
  ],
};
const arquivoDoBanco = join(tmpdir(), 'dk-e2e-banco.json');
writeFileSync(arquivoDoBanco, JSON.stringify(fixture));

const env = {
  ...process.env,
  BASE_PATH: '/',
  SITE_URL: 'http://127.0.0.1:4173',
  PUBLIC_WHATSAPP_NUMBER: '5561900000000',
  // ID fictício: faz o banner de cookies existir. O script da Meta é bloqueado nos testes.
  PUBLIC_META_PIXEL_ID: '1234567890',
  PUBLIC_SUPABASE_URL: SUPABASE_FALSO,
  PUBLIC_SUPABASE_PUBLISHABLE_KEY: CHAVE_FALSA,
  VITE_SUPABASE_URL: SUPABASE_FALSO,
  VITE_SUPABASE_PUBLISHABLE_KEY: CHAVE_FALSA,
  VITE_WHATSAPP_NUMBER: '5561900000000',
  BANCO_FIXTURE: arquivoDoBanco,
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
