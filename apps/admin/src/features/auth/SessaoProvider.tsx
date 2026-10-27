import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../../lib/supabase';

interface SessaoContexto {
  /** true até saber se há sessão e se ela pertence a um admin. */
  carregando: boolean;
  session: Session | null;
  /** null enquanto verifica; false quando o usuário logado não está na lista de admins. */
  ehAdmin: boolean | null;
  /** true quando o usuário chegou pelo link de recuperação de senha. */
  recuperandoSenha: boolean;
  sair: () => Promise<void>;
  /** Chamar depois de a nova senha ser salva, para liberar o painel. */
  concluirRecuperacao: () => void;
}

const Contexto = createContext<SessaoContexto | null>(null);

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessaoCarregada, setSessaoCarregada] = useState(false);
  const [ehAdmin, setEhAdmin] = useState<boolean | null>(null);
  const [recuperandoSenha, setRecuperandoSenha] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    const cliente = supabase;

    void cliente.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessaoCarregada(true);
    });

    const { data } = cliente.auth.onAuthStateChange((evento, novaSessao) => {
      if (evento === 'PASSWORD_RECOVERY') setRecuperandoSenha(true);
      setSession(novaSessao);
      setSessaoCarregada(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!supabase || !userId) return;
    let cancelado = false;
    void supabase.rpc('is_admin').then(({ data, error }) => {
      if (!cancelado) setEhAdmin(error ? false : data === true);
    });
    return () => {
      cancelado = true;
    };
  }, [userId]);

  const valor = useMemo<SessaoContexto>(
    () => ({
      // Sem supabase configurado não há o que carregar; a tela de aviso assume.
      carregando: Boolean(supabase) && (!sessaoCarregada || (userId !== null && ehAdmin === null)),
      session,
      ehAdmin: userId ? ehAdmin : null,
      recuperandoSenha,
      sair: async () => {
        await supabase?.auth.signOut();
        setEhAdmin(null);
        setRecuperandoSenha(false);
      },
      concluirRecuperacao: () => setRecuperandoSenha(false),
    }),
    [sessaoCarregada, session, userId, ehAdmin, recuperandoSenha],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSessao(): SessaoContexto {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useSessao precisa estar dentro de <SessaoProvider>');
  return ctx;
}
