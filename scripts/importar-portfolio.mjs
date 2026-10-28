// Importa o portfólio inicial (apps/site/src/data/portfolio-inicial.json) para o banco e o Storage.
// Uso único: depois disso, o portfólio é editado pelo painel.
//
//   node --env-file=.env scripts/importar-portfolio.mjs --simular   (não usa rede nem senha)
//   node --env-file=.env scripts/importar-portfolio.mjs             (pede o e-mail e a senha do admin)
//
// A senha é digitada no seu terminal, não é gravada em lugar nenhum e não passa por este chat.
// É seguro rodar de novo: itens cujo título já existe são pulados.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import readline from 'node:readline';
// Regras puras compartilhadas com o painel (arquivos sem imports, o Node 24 lê TypeScript direto).
import { hashDoConteudo } from '../packages/media/src/hash.ts';
import { planejarLarguras } from '../packages/media/src/planejar.ts';
import { caminhoDaVariante } from '../packages/media/src/url.ts';

const raiz = resolve(import.meta.dirname, '..');
const simular = process.argv.includes('--simular');
const CACHE_LONGO = '31536000';

const escrever = (texto = '') => process.stdout.write(`${texto}\n`);

// Reaproveita as instalações que o projeto já tem (nenhuma dependência nova).
const doSite = createRequire(
  createRequire(resolve(raiz, 'apps/site/package.json')).resolve('astro/package.json'),
);
const sharp = doSite('sharp');

const itens = JSON.parse(
  readFileSync(resolve(raiz, 'apps/site/src/data/portfolio-inicial.json'), 'utf8'),
);
const pastaImagens = resolve(raiz, 'apps/site/src/assets/portfolio');
const pastaVideos = resolve(raiz, 'apps/site/public/portfolio');

/** Gera as variantes WebP (mesmas larguras do painel) e a miniatura borrada de uma imagem. */
async function prepararImagem(arquivo) {
  const original = readFileSync(arquivo);
  const meta = await sharp(original).rotate().metadata();
  const larguras = planejarLarguras(meta.width);
  const variantes = [];
  for (const largura of larguras) {
    const blob = await sharp(original)
      .rotate()
      .resize({ width: largura, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    variantes.push({ largura, blob });
  }
  const miniatura = await sharp(original)
    .rotate()
    .resize({ width: 24 })
    .webp({ quality: 40 })
    .toBuffer();
  return {
    hash: await hashDoConteudo(
      original.buffer.slice(original.byteOffset, original.byteOffset + original.byteLength),
    ),
    larguraOriginal: meta.width,
    alturaOriginal: meta.height,
    variantes,
    blur: `data:image/webp;base64,${miniatura.toString('base64')}`,
  };
}

function perguntar(pergunta, oculto = false) {
  return new Promise((resolver) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
    if (oculto) {
      const escreverOriginal = rl._writeToOutput.bind(rl);
      // Mostra só a pergunta; o que é digitado não aparece na tela.
      rl._writeToOutput = (texto) => {
        if (texto.startsWith(pergunta)) escreverOriginal(texto);
      };
    }
    rl.question(pergunta, (resposta) => {
      rl.close();
      if (oculto) process.stdout.write('\n');
      resolver(resposta.trim());
    });
  });
}

async function conectar() {
  const url = process.env.VITE_SUPABASE_URL;
  const chave = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !chave) {
    throw new Error(
      'Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY (use --env-file=.env).',
    );
  }
  const { createClient } = createRequire(resolve(raiz, 'apps/admin/package.json'))(
    '@supabase/supabase-js',
  );
  const cliente = createClient(url, chave, { auth: { persistSession: false } });
  const email = await perguntar('E-mail do admin: ');
  const senha = await perguntar('Senha: ', true);
  const { error } = await cliente.auth.signInWithPassword({ email, password: senha });
  if (error) throw new Error('Não foi possível entrar: e-mail ou senha incorretos.');
  const { data: ehAdmin } = await cliente.rpc('is_admin');
  if (ehAdmin !== true) throw new Error('Esta conta não está na lista de admins da DK.');
  return cliente;
}

async function enviar(cliente, caminho, conteudo, tipo) {
  const { error } = await cliente.storage
    .from('portfolio')
    .upload(caminho, conteudo, { contentType: tipo, cacheControl: CACHE_LONGO, upsert: true });
  if (error) throw new Error(`Falha ao enviar ${caminho}: ${error.message}`);
}

const cliente = simular ? null : await conectar();
const saida = join(tmpdir(), 'dk-import-simulado');
if (simular) mkdirSync(saida, { recursive: true });

let existentes = new Set();
if (cliente) {
  const { data, error } = await cliente.from('portfolio_items').select('titulo');
  if (error)
    throw new Error(
      `Não foi possível ler o portfólio (a migration foi aplicada?): ${error.message}`,
    );
  existentes = new Set(data.map((linha) => linha.titulo));
}

let criados = 0;
for (const [indice, item] of itens.entries()) {
  if (existentes.has(item.titulo)) {
    escrever(`= já existe, pulando: ${item.titulo}`);
    continue;
  }
  const imagem = await prepararImagem(join(pastaImagens, `${item.imagem}.jpg`));
  const base = `itens/${imagem.hash}`;
  let videoPath = null;
  let videoBytes = null;

  if (item.tipo === 'video') {
    videoBytes = readFileSync(join(pastaVideos, `${item.video}.mp4`));
    const hashVideo = await hashDoConteudo(
      videoBytes.buffer.slice(videoBytes.byteOffset, videoBytes.byteOffset + videoBytes.byteLength),
    );
    videoPath = `itens/${hashVideo}.mp4`;
  }

  const larguras = imagem.variantes.map((v) => v.largura);
  if (simular) {
    for (const v of imagem.variantes) {
      const destino = join(saida, caminhoDaVariante(base, v.largura).replaceAll('/', '_'));
      writeFileSync(destino, v.blob);
    }
    escrever(
      `+ [simulado] ${item.titulo} -> ${base} larguras ${larguras.join('/')} (${imagem.larguraOriginal}x${imagem.alturaOriginal})${videoPath ? ` + ${videoPath} (${Math.round(videoBytes.length / 1024)} kB)` : ''}`,
    );
    criados += 1;
    continue;
  }

  for (const v of imagem.variantes)
    await enviar(cliente, caminhoDaVariante(base, v.largura), v.blob, 'image/webp');
  if (videoPath) await enviar(cliente, videoPath, videoBytes, 'video/mp4');
  const { error } = await cliente.from('portfolio_items').insert({
    titulo: item.titulo,
    descricao: item.descricao,
    categoria: item.categoria,
    tipo: item.tipo,
    imagem_base: base,
    larguras,
    largura_original: imagem.larguraOriginal,
    altura_original: imagem.alturaOriginal,
    blur: imagem.blur,
    video_path: videoPath,
    destaque: false,
    publicado: true,
    ordem: indice,
  });
  if (error) throw new Error(`Falha ao gravar "${item.titulo}": ${error.message}`);
  escrever(`+ ${item.titulo}`);
  criados += 1;
}

escrever(
  simular
    ? `\nSimulação concluída: ${criados} itens preparados em ${saida}.`
    : `\nPronto: ${criados} itens importados.`,
);
