import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  aberto: boolean;
  titulo: string;
  aoFechar: () => void;
  children: ReactNode;
}

/** Janela modal usando o <dialog> nativo: já prende o foco, fecha com Esc e bloqueia a página. */
export function Dialogo({ aberto, titulo, aoFechar, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (aberto && !dialogo.open) dialogo.showModal();
    if (!aberto && dialogo.open) dialogo.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="dialogo-titulo"
      onClose={aoFechar}
      className="bg-creme text-ebano-950 m-auto max-h-[94dvh] w-[min(96vw,40rem)] overflow-auto rounded-xl p-0 backdrop:bg-black/60"
    >
      {aberto && (
        <div className="p-4 sm:p-6">
          <h2 id="dialogo-titulo" className="font-(family-name:--font-display) text-2xl">
            {titulo}
          </h2>
          <div className="mt-4">{children}</div>
        </div>
      )}
    </dialog>
  );
}
