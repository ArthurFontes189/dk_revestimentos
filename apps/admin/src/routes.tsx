import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  Outlet,
} from '@tanstack/react-router';
import { AvisoConfiguracao, Carregando, SemAcesso } from './components/Avisos';
import { Shell } from './components/Shell';
import { LoginPage } from './features/auth/LoginPage';
import { RedefinirSenhaPage } from './features/auth/RedefinirSenhaPage';
import { useSessao } from './features/auth/SessaoProvider';
import { InicioPage } from './features/inicio/InicioPage';
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

// Rota por hash (/admin/#/...): o GitHub Pages não tem rewrites.
export const router = createRouter({
  routeTree: raiz.addChildren([login, redefinirSenha, protegida.addChildren([inicio])]),
  history: createHashHistory(),
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
