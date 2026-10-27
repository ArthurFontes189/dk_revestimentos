/**
 * Meta Pixel com consentimento (LGPD).
 * - Só existe se PUBLIC_META_PIXEL_ID for um ID válido; sem ele, nada é carregado.
 * - O script da Meta só é carregado DEPOIS de o visitante aceitar.
 * - Recusar apaga os cookies da Meta e nada é enviado.
 */
const ID = import.meta.env.PUBLIC_META_PIXEL_ID ?? '';
const CHAVE = 'dk_consentimento';

export type Escolha = 'aceito' | 'recusado';
export type NomeEvento = 'Lead' | 'Contact' | 'ViewContent';

/** Só dígitos: o ID entra num script inline, então nunca aceitamos outra coisa. */
export const rastreioConfigurado = /^\d{5,20}$/.test(ID);

type JanelaMeta = Window & { fbq?: (...argumentos: unknown[]) => void };

export function lerEscolha(): Escolha | null {
  try {
    const valor = localStorage.getItem(CHAVE);
    return valor === 'aceito' || valor === 'recusado' ? valor : null;
  } catch {
    return null;
  }
}

let pixelCarregado = false;

/** Código oficial de instalação do Meta Pixel (inalterado), com o ID validado. */
function carregarPixel(): void {
  if (pixelCarregado || !rastreioConfigurado) return;
  pixelCarregado = true;
  const script = document.createElement('script');
  script.textContent =
    "!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');" +
    `fbq('init','${ID}');fbq('track','PageView');`;
  document.head.append(script);
}

function apagarCookiesDaMeta(): void {
  const partes = location.hostname.split('.');
  const dominios = ['', ...partes.map((_, i) => `; domain=${partes.slice(i).join('.')}`)];
  for (const nome of ['_fbp', '_fbc']) {
    for (const dominio of dominios) {
      document.cookie = `${nome}=; Max-Age=0; path=/${dominio}`;
    }
  }
}

export function salvarEscolha(escolha: Escolha): void {
  try {
    localStorage.setItem(CHAVE, escolha);
  } catch {
    // Sem armazenamento: a escolha vale só nesta página.
  }
  if (escolha === 'aceito') carregarPixel();
  else apagarCookiesDaMeta();
}

/** Anuncia um evento de conversão. É ignorado se o visitante não aceitou. */
export function registrar(nome: NomeEvento, dados?: Record<string, string>): void {
  window.dispatchEvent(new CustomEvent('dk:evento', { detail: { nome, dados } }));
}

export function iniciarRastreio(): void {
  if (!rastreioConfigurado) return;
  if (lerEscolha() === 'aceito') carregarPixel();

  window.addEventListener('dk:evento', (evento) => {
    if (lerEscolha() !== 'aceito') return;
    const { nome, dados } = (
      evento as CustomEvent<{ nome: NomeEvento; dados?: Record<string, string> }>
    ).detail;
    (window as JanelaMeta).fbq?.('track', nome, dados);
  });

  // Clique em qualquer link de WhatsApp conta como "Contact".
  document.addEventListener('click', (evento) => {
    const alvo = evento.target as Element | null;
    if (alvo?.closest?.('a[href^="https://wa.me/"]')) registrar('Contact');
  });
}
