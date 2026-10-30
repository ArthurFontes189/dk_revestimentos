// Gera os icones PNG do PWA (painel e site) a partir do favicon.svg. Uso único: os PNGs ficam no git.
import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '..');
// Reaproveita o sharp do Astro (nenhuma dependência nova).
const doSite = createRequire(
  createRequire(resolve(raiz, 'apps/site/package.json')).resolve('astro/package.json'),
);
const sharp = doSite('sharp');

const COR_FUNDO = '#0e0f13';
const svg = readFileSync(resolve(raiz, 'apps/site/public/favicon.svg'));
// "maskable": o sistema recorta até 20% das bordas, então o desenho ocupa só o centro (80%).
const PROPORCAO_SEGURA = 0.6;

async function icone(arquivo, lado, { maskable = false } = {}) {
  const miolo = Math.round(lado * (maskable ? PROPORCAO_SEGURA : 1));
  const desenho = await sharp(svg, { density: 384 }).resize(miolo, miolo).png().toBuffer();
  const base = maskable
    ? sharp({ create: { width: lado, height: lado, channels: 4, background: COR_FUNDO } })
    : sharp({ create: { width: lado, height: lado, channels: 4, background: '#00000000' } });
  const posicao = Math.round((lado - miolo) / 2);
  await base
    .composite([{ input: desenho, left: posicao, top: posicao }])
    .png()
    .toFile(arquivo);
}

for (const app of ['admin', 'site']) {
  const pasta = resolve(raiz, `apps/${app}/public/icons`);
  mkdirSync(pasta, { recursive: true });
  await icone(resolve(pasta, 'icon-192.png'), 192);
  await icone(resolve(pasta, 'icon-512.png'), 512);
  await icone(resolve(pasta, 'icon-maskable-512.png'), 512, { maskable: true });
  // O iOS não aceita transparência no icone da tela inicial.
  await icone(resolve(pasta, 'apple-touch-icon.png'), 180, { maskable: true });
}
