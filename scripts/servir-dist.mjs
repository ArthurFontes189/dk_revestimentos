// Servidor estático mínimo para os testes e2e: serve ./dist em http://127.0.0.1:4173.
// Imita o GitHub Pages: pasta vira index.html e rota inexistente devolve 404.html com status 404.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '..', 'dist');
const porta = Number(process.env.PORT ?? 4173);

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.woff2': 'font/woff2',
};

function localizar(urlPath) {
  const caminho = normalize(decodeURIComponent(urlPath)).replace(/^([/\\])+/, '');
  let alvo = join(raiz, caminho);
  // Impede sair de ./dist com "..".
  if (!alvo.startsWith(raiz)) return null;
  if (existsSync(alvo) && statSync(alvo).isDirectory()) alvo = join(alvo, 'index.html');
  return existsSync(alvo) && statSync(alvo).isFile() ? alvo : null;
}

createServer((req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');
  const arquivo = localizar(pathname);
  const status = arquivo ? 200 : 404;
  const final = arquivo ?? join(raiz, '404.html');
  res.writeHead(status, {
    'Content-Type': TIPOS[extname(final)] ?? 'application/octet-stream',
  });
  createReadStream(final).pipe(res);
}).listen(porta, '127.0.0.1', () => {
  console.warn(`Servindo ${raiz} em http://127.0.0.1:${porta}`);
});
