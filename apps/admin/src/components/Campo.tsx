import type { InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  rotulo: string;
}

/** Campo de formulário acessível, com alvo de toque de 44 px. */
export function Campo({ rotulo, id, ...resto }: Props) {
  const campoId = id ?? resto.name;
  return (
    <div>
      <label htmlFor={campoId} className="text-ebano-800 block text-sm font-medium">
        {rotulo}
      </label>
      <input
        id={campoId}
        {...resto}
        className="border-ebano-300 text-ebano-950 focus-visible:outline-carvalho-600 mt-1 block min-h-11 w-full rounded-lg border bg-white px-3 focus-visible:outline-2 focus-visible:outline-offset-1"
      />
    </div>
  );
}

export const classeBotaoPrimario =
  'bg-carvalho-600 text-creme hover:bg-carvalho-700 focus-visible:outline-carvalho-600 inline-flex min-h-11 w-full items-center justify-center rounded-lg px-6 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60';
