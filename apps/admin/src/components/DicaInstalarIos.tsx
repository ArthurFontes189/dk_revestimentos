import { useState } from 'react';

const CHAVE = 'dk_dica_ios_vista';

/** O Safari do iPhone não oferece "Instalar": só o menu Compartilhar, que quase ninguém conhece. */
function deveMostrar(): boolean {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const instalado = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (!ios || instalado) return false;
  try {
    return localStorage.getItem(CHAVE) !== '1';
  } catch {
    return false;
  }
}

/** Dica mostrada uma única vez, só no iPhone/iPad ainda não instalado. */
export function DicaInstalarIos() {
  const [visivel, setVisivel] = useState(deveMostrar);
  if (!visivel) return null;

  function dispensar() {
    try {
      localStorage.setItem(CHAVE, '1');
    } catch {
      // Sem armazenamento: a dica volta na próxima visita, o que é aceitável.
    }
    setVisivel(false);
  }

  return (
    <div
      role="status"
      className="bg-ebano-950 text-creme fixed inset-x-0 bottom-20 z-40 mx-4 flex items-center gap-3 rounded-xl p-4 text-sm md:bottom-4 md:left-auto md:max-w-sm"
    >
      <p className="flex-1">
        Para instalar o painel: toque em <strong>Compartilhar</strong> e depois em{' '}
        <strong>Adicionar à Tela de Início</strong>.
      </p>
      <button
        type="button"
        onClick={dispensar}
        className="bg-ouro-500 text-ebano-950 inline-flex min-h-11 items-center rounded-lg px-4 font-medium"
      >
        Entendi
      </button>
    </div>
  );
}
