import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Navigate,
  Outlet,
} from '@tanstack/react-router';
import { AvisoConfiguracao, Carregando, SemAcesso } from './components/Avisos';
import { Shell } from './components/Shell';
import { LoginPage } from './features/auth/LoginPage';
import { RedefinirSenhaPage } from './features/auth/RedefinirSenhaPage';
import { useSessao } from './features/auth/SessaoProvider';
import { CaixaPage } from './features/caixa/CaixaPage';
import { ClientesPage } from './features/clientes/ClientesPage';
import { EquipePage } from './features/equipe/EquipePage';
import { InicioPage } from './features/inicio/InicioPage';
import { LeadsPage } from './features/leads/LeadsPage';
import { ObrasPage } from './features/obras/ObrasPage';
import { supabaseConfigurado } from './lib/supabase';

/** Área protegida: só admin logado entra. */
function AreaProtegida() {
  const { carregando, session, ehAdmin, recuperandoSenha } = useSessao();
  if (!supabaseConfigurado) return <AvisoConfiguracao />;
  if (carregando) return <Carregando />;
  if (!session) return <Navigate to="/login" />;
  if (recuperandoSenha) return <Navigate to="/redefinir-senha" />;
  if (!ehAdmin) return <SemAcesso />;
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}

const raiz = createRootRoute({ component: Outlet });

const login = createRoute({ getParentRoute: () => raiz, path: '/login', component: LoginPage });
const redefinirSenha = createRoute({
  getParentRoute: () => raiz,
  path: '/redefinir-senha',
  component: RedefinirSenhaPage,
});
const protegida = createRoute({
  getParentRoute: () => raiz,
  id: 'protegida',
  component: AreaProtegida,
});
const inicio = createRoute({ getParentRoute: () => protegida, path: '/', component: InicioPage });
const leads = createRoute({
  getParentRoute: () => protegida,
  path: '/leads',
  component: LeadsPage,
});
const clientes = createRoute({
  getParentRoute: () => protegida,
  path: '/clientes',
  component: ClientesPage,
});
const obras = createRoute({
  getParentRoute: () => protegida,
  path: '/obras',
  component: ObrasPage,
});
const caixa = createRoute({
  getParentRoute: () => protegida,
  path: '/caixa',
  component: CaixaPage,
});
const equipe = createRoute({
  getParentRoute: () => protegida,
  path: '/equipe',
  component: EquipePage,
});
// Páginas com o processamento de mídia ficam em arquivos separados, carregados só quando abertas.
const portfolio = createRoute({
  getParentRoute: () => protegida,
  path: '/portfolio',
  component: lazyRouteComponent(
    () => import('./features/portfolio/PortfolioPage'),
    'PortfolioPage',
  ),
});
const depoimentos = createRoute({
  getParentRoute: () => protegida,
  path: '/depoimentos',
  component: lazyRouteComponent(
    () => import('./features/depoimentos/DepoimentosPage'),
    'DepoimentosPage',
  ),
});

// Rota por hash (/admin/#/...): o GitHub Pages não tem rewrites.
export const router = createRouter({
  routeTree: raiz.addChildren([
    login,
    redefinirSenha,
    protegida.addChildren([inicio, leads, clientes, obras, caixa, equipe, portfolio, depoimentos]),
  ]),
  history: createHashHistory(),
  defaultPendingComponent: Carregando,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
