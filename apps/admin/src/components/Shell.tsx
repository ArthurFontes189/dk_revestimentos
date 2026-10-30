import { Link } from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';
import { useSessao } from '../features/auth/SessaoProvider';
import { Dialogo } from './Dialogo';

// Cada entrega do docs/PLANO.md acrescenta o seu item aqui (leads, clientes, obras…).
const ITENS_MENU = [
  { para: '/', rotulo: 'Início' },
  { para: '/leads', rotulo: 'Leads' },
  { para: '/clientes', rotulo: 'Clientes' },
  { para: '/obras', rotulo: 'Obras' },
  { para: '/equipe', rotulo: 'Equipe' },
  { para: '/portfolio', rotulo: 'Portfólio' },
  { para: '/depoimentos', rotulo: 'Depoimentos' },
] as const;

// No celular só os quatro de uso diário ficam na barra; o resto abre em "Mais".
const QUANTIDADE_NA_BARRA = 4;
const ITENS_BARRA = ITENS_MENU.slice(0, QUANTIDADE_NA_BARRA);
const ITENS_EXTRAS = ITENS_MENU.slice(QUANTIDADE_NA_BARRA);

const classeLinkBase =
  'focus-visible:outline-ouro-500 flex min-h-11 items-center rounded-lg px-3 transition-colors focus-visible:outline-2';

// Barra inferior do celular: cinco itens precisam caber em 360 px, então padding e fonte menores.
const classeLinkInferior =
  'focus-visible:outline-ouro-500 text-ebano-100 flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-lg px-0 text-[10px] tracking-tight transition-colors focus-visible:outline-2';

function Marca() {
  return (
    <span className="font-(family-name:--font-display) text-lg">
      DK <span className="text-ouro-500">Revestimentos</span>
    </span>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { sair } = useSessao();
  const [maisAberto, setMaisAberto] = useState(false);

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
        className="bg-ebano-950 text-creme fixed inset-x-0 bottom-0 flex justify-around px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden"
      >
        {ITENS_BARRA.map((item) => (
          <Link
            key={item.para}
            to={item.para}
            className={classeLinkInferior}
            activeProps={{ className: 'text-ouro-500' }}
          >
            {item.rotulo}
          </Link>
        ))}
        <button type="button" onClick={() => setMaisAberto(true)} className={classeLinkInferior}>
          Mais
        </button>
      </nav>

      <Dialogo aberto={maisAberto} titulo="Mais" aoFechar={() => setMaisAberto(false)}>
        <nav aria-label="Mais opções" className="flex flex-col gap-1">
          {ITENS_EXTRAS.map((item) => (
            <Link
              key={item.para}
              to={item.para}
              onClick={() => setMaisAberto(false)}
              className={`${classeLinkBase} text-ebano-900 hover:bg-ebano-100`}
              activeProps={{ className: 'bg-ebano-100 text-carvalho-700' }}
            >
              {item.rotulo}
            </Link>
          ))}
        </nav>
      </Dialogo>
    </div>
  );
}
