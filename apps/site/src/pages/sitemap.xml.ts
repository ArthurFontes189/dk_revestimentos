import type { APIRoute } from 'astro';
import { url } from '../lib/urls';

// Só páginas indexáveis: as de anúncio (noindex) ficam de fora de propósito.
const PAGINAS = ['', 'privacidade/'];

export const GET: APIRoute = ({ site }) => {
  const itens = PAGINAS.map(
    (pagina) => `  <url><loc>${new URL(url(pagina), site).href}</loc></url>`,
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${itens.join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
