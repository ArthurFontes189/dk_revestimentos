// Junta os dois builds em um único artefato para o GitHub Pages:
//   dist/        <- apps/site/dist   (site público)
//   dist/admin/  <- apps/admin/dist  (painel)
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '..');
const destino = resolve(raiz, 'dist');
const origemSite = resolve(raiz, 'apps/site/dist');
const origemAdmin = resolve(raiz, 'apps/admin/dist');

for (const origem of [origemSite, origemAdmin]) {
  if (!existsSync(origem)) {
    console.error(`Build não encontrado: ${origem}. Rode "pnpm build" a partir da raiz.`);
    process.exit(1);
  }
}

await rm(destino, { recursive: true, force: true });
await mkdir(destino, { recursive: true });
await cp(origemSite, destino, { recursive: true });
await cp(origemAdmin, resolve(destino, 'admin'), { recursive: true });
// O Pages não deve processar o artefato com Jekyll.
await writeFile(resolve(destino, '.nojekyll'), '');

console.warn(`Artefato pronto em ${destino}`);
