import { defineConfig } from '@playwright/test';

const URL_BASE = 'http://127.0.0.1:4173';

// As 4 larguras da spec: celular, tablet, notebook e tela grande.
const TELAS = [
  { name: 'celular', width: 360, height: 740, celular: true },
  { name: 'tablet', width: 768, height: 1024, celular: false },
  { name: 'notebook', width: 1280, height: 800, celular: false },
  { name: 'tela-grande', width: 1920, height: 1080, celular: false },
] as const;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: URL_BASE, locale: 'pt-BR', trace: 'retain-on-failure' },
  projects: TELAS.map((tela) => ({
    name: tela.name,
    use: {
      browserName: 'chromium',
      viewport: { width: tela.width, height: tela.height },
      isMobile: tela.celular,
      hasTouch: tela.celular,
    },
  })),
  // Serve o ./dist gerado por `node scripts/build-e2e.mjs`.
  webServer: {
    command: 'node scripts/servir-dist.mjs',
    url: `${URL_BASE}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
