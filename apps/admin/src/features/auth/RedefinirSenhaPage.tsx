import { validarNovaSenha } from '@dk/core';
import { Navigate, useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { AvisoConfiguracao, Carregando } from '../../components/Avisos';
import { Campo, classeBotaoPrimario } from '../../components/Campo';
import { supabase, supabaseConfigurado } from '../../lib/supabase';
import { useSessao } from './SessaoProvider';

export function RedefinirSenhaPage() {
  const { carregando, session, concluirRecuperacao } = useSessao();
  const navegar = useNavigate();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!supabaseConfigurado) return <AvisoConfiguracao />;
  if (carregando) return <Carregando />;
  // Só chega aqui quem veio pelo link do e-mail (a sessão de recuperação).
  if (!session) return <Navigate to="/login" />;

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!supabase) return;
    const dados = new FormData(evento.currentTarget);
    const senha = String(dados.get('senha') ?? '');
    const problema = validarNovaSenha(senha, String(dados.get('confirmacao') ?? ''));
    if (problema) {
      setErro(problema);
      return;
    }
    setEnviando(true);
    setErro(null);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setEnviando(false);
    if (error) {
      setErro('Não foi possível salvar a nova senha. Peça um novo link e tente de novo.');
      return;
    }
    concluirRecuperacao();
    void navegar({ to: '/' });
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <h1 className="font-(family-name:--font-display) text-3xl">Nova senha</h1>
        <form onSubmit={(e) => void aoEnviar(e)} className="mt-8 space-y-4">
          <Campo
            rotulo="Nova senha"
            name="senha"
            type="password"
            autoComplete="new-password"
            required
          />
          <Campo
            rotulo="Repita a nova senha"
            name="confirmacao"
            type="password"
            autoComplete="new-password"
            required
          />
          {erro && (
            <p role="alert" className="text-sm text-red-700">
              {erro}
            </p>
          )}
          <button type="submit" className={classeBotaoPrimario} disabled={enviando}>
            {enviando ? 'Salvando…' : 'Salvar nova senha'}
          </button>
        </form>
      </div>
    </main>
  );
}
