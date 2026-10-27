import { Navigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { AvisoConfiguracao, Carregando } from '../../components/Avisos';
import { Campo, classeBotaoPrimario } from '../../components/Campo';
import { supabase, supabaseConfigurado } from '../../lib/supabase';
import { useSessao } from './SessaoProvider';

type Modo = 'entrar' | 'recuperar';

export function LoginPage() {
  const { carregando, session } = useSessao();
  const [modo, setModo] = useState<Modo>('entrar');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  if (!supabaseConfigurado) return <AvisoConfiguracao />;
  if (carregando) return <Carregando />;
  if (session) return <Navigate to="/" />;

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!supabase) return;
    const dados = new FormData(evento.currentTarget);
    const email = String(dados.get('email') ?? '').trim();
    setEnviando(true);
    setErro(null);
    setAviso(null);

    if (modo === 'entrar') {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: String(dados.get('senha') ?? ''),
      });
      // Mensagem única: não revela se o e-mail existe.
      if (error) setErro('E-mail ou senha incorretos.');
    } else {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
      });
      // Resposta igual exista ou não a conta (evita enumerar e-mails).
      setAviso('Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.');
    }
    setEnviando(false);
  }

  const recuperando = modo === 'recuperar';

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <p className="text-carvalho-600 text-sm tracking-[0.2em] uppercase">DK Revestimentos</p>
        <h1 className="mt-2 font-(family-name:--font-display) text-3xl">
          {recuperando ? 'Recuperar senha' : 'Entrar no painel'}
        </h1>

        <form onSubmit={(e) => void aoEnviar(e)} className="mt-8 space-y-4">
          <Campo
            rotulo="E-mail"
            name="email"
            type="email"
            autoComplete="username"
            required
            autoFocus
          />
          {!recuperando && (
            <Campo
              rotulo="Senha"
              name="senha"
              type="password"
              autoComplete="current-password"
              required
            />
          )}

          {erro && (
            <p role="alert" className="text-sm text-red-700">
              {erro}
            </p>
          )}
          {aviso && (
            <p role="status" className="text-sm text-green-800">
              {aviso}
            </p>
          )}

          <button type="submit" className={classeBotaoPrimario} disabled={enviando}>
            {enviando ? 'Aguarde…' : recuperando ? 'Enviar link' : 'Entrar'}
          </button>
        </form>

        <button
          type="button"
          className="text-carvalho-700 mt-6 min-h-11 text-sm underline"
          onClick={() => {
            setModo(recuperando ? 'entrar' : 'recuperar');
            setErro(null);
            setAviso(null);
          }}
        >
          {recuperando ? 'Voltar para o login' : 'Esqueci minha senha'}
        </button>
      </div>
    </main>
  );
}
