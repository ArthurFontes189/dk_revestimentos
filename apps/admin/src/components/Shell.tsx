import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useSessao } from '../features/auth/SessaoProvider';

// Cada entrega do docs/PLANO.md acrescenta o seu item aqui (leads, clientes, obras…).
const ITENS_MENU = [
  { para: '/', rotulo: 'Início' },
  { para: '/leads', rotulo: 'Leads' },
  { para: '/portfolio', rotulo: 'Portfólio' },
  { para: '/depoimentos', rotulo: 'Depoimentos' },
] as const;

const classeLinkBase =
  'focus-visible:outline-ouro-500 flex min-h-11 items-center rounded-lg px-3 transition-colors focus-visible:outline-2';

function Marca() {
  return (
    <span className="font-(family-name:--font-display) text-lg">
      DK <span className="text-ouro-500">Revestimentos</span>
    </span>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { sair } = useSessao();

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[16rem_1fr]">
      {/* Computador: menu lateral fixo */}
      <aside className="bg-ebano-950 text-creme hidden flex-col gap-6 p-4 md:sticky md:top-0 md:flex md:h-dvh">
        <Marca />
        <nav aria-label="Principal" className="flex flex-col gap-1">
          {ITENS_MENU.map((item) => (
            <Link
              key={item.para}
              to={item.para}
              className={`${classeLinkBase} text-ebano-100 hover:bg-ebano-800`}
              activeProps={{ className: 'bg-ebano-800 text-ouro-500' }}
            >
              {item.rotulo}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          onClick={() => void sair()}
          className={`${classeLinkBase} text-ebano-100 hover:bg-ebano-800 mt-auto`}
        >
          Sair
        </button>
      </aside>

      <div className="flex min-h-dvh flex-col pb-20 md:pb-0">
        {/* Celular: barra superior */}
        <header className="bg-ebano-950 text-creme flex items-center justify-between px-4 py-3 md:hidden">
          <Marca />
          <button
            type="button"
            onClick={() => void sair()}
            className={`${classeLinkBase} text-ebano-100`}
          >
            Sair
          </button>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>

      {/* Celular: navegação inferior */}
      <nav
        aria-label="Principal"
        className="bg-ebano-950 text-creme fixed inset-x-0 bottom-0 flex justify-around px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden"
      >
        {ITENS_MENU.map((item) => (
          <Link
            key={item.para}
            to={item.para}
            className={`${classeLinkBase} text-ebano-100 flex-1 justify-center`}
            activeProps={{ className: 'text-ouro-500' }}
          >
            {item.rotulo}
          </Link>
        ))}
      </nav>
    </div>
  );
}
