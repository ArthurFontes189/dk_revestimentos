import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// O painel fica em <BASE_PATH>admin/ (BASE_PATH termina com "/").
const base = `${process.env.BASE_PATH ?? '/'}admin/`;

export default defineConfig({
  base,
  // Lê o .env da raiz do monorepo (um só arquivo para site e painel).
  envDir: '../../',
  plugins: [react(), tailwindcss()],
  server: { port: 5174 },
});
