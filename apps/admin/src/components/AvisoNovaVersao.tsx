import { aplicarVersaoNova, useVersaoNovaPronta } from '../lib/pwa';

/** Avisa que há versão nova do painel; só recarrega quando o admin aceitar. */
export function AvisoNovaVersao() {
  if (!useVersaoNovaPronta()) return null;
  return (
    <div
      role="status"
      className="bg-ebano-950 text-creme fixed inset-x-0 top-0 z-50 flex flex-wrap items-center justify-center gap-3 px-4 py-2 text-sm"
    >
      <span>Nova versão do painel disponível.</span>
      <button
        type="button"
        onClick={aplicarVersaoNova}
        className="bg-ouro-500 text-ebano-950 inline-flex min-h-11 items-center rounded-lg px-4 font-medium"
      >
        Atualizar agora
      </button>
    </div>
  );
}
