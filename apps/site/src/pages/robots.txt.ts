import type { APIRoute } from 'astro';
import { url } from '../lib/urls';

export const GET: APIRoute = ({ site }) => {
  // Em homologação (PUBLIC_INDEXAR != "true") o site pede para não ser indexado.
  const indexar = import.meta.env.PUBLIC_INDEXAR === 'true';
  const corpo = indexar
    ? `User-agent: *\nAllow: /\n\nSitemap: ${new URL(url('sitemap.xml'), site).href}\n`
    : 'User-agent: *\nDisallow: /\n';
  return new Response(corpo, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
