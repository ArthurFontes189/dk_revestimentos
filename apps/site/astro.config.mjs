import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

// BASE_PATH: "/" com domínio próprio; "/nome-do-repo/" em GitHub Pages de projeto. Sempre termina com "/".
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  site: process.env.SITE_URL ?? 'http://localhost:4321',
  base,
  trailingSlash: 'always',
  // CSS pequeno embutido no HTML: tira um pedido que bloqueava a primeira pintura.
  build: { inlineStylesheets: 'always' },
  integrations: [react()],
  // Lê o .env da raiz do monorepo (um só arquivo para site e painel).
  vite: { plugins: [tailwindcss()], envDir: '../../' },
});
