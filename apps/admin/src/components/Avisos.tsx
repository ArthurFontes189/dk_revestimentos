import { useSessao } from '../features/auth/SessaoProvider';
import { classeBotaoPrimario } from './Campo';

function Centralizado({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-(family-name:--font-display) text-2xl">{titulo}</h1>
        <div className="text-texto-suave mt-3 space-y-4">{children}</div>
      </div>
    </main>
  );
}

export function Carregando() {
  return (
    <main className="grid min-h-dvh place-items-center" aria-busy="true">
      <p className="text-texto-suave">Carregando…</p>
    </main>
  );
}

export function AvisoConfiguracao() {
  return (
    <Centralizado titulo="Painel não configurado">
      <p>
        Faltam as variáveis <code>VITE_SUPABASE_URL</code> e{' '}
        <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>. Veja o <code>.env.example</code>.
      </p>
    </Centralizado>
  );
}

export function SemAcesso() {
  const { sair } = useSessao();
  return (
    <Centralizado titulo="Sem acesso ao painel">
      <p>Esta conta não tem permissão para usar o painel. Entre com a conta do administrador.</p>
      <button type="button" className={classeBotaoPrimario} onClick={() => void sair()}>
        Sair
      </button>
    </Centralizado>
  );
}
