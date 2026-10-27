import {
  leadSchema,
  montarLinkWhatsApp,
  montarMensagemOrcamento,
  TIPOS_SERVICO,
  type TipoServico,
} from '@dk/core';
import { useState, type FormEvent, type ReactNode } from 'react';
import { lerOrigem } from '../lib/origem-cliente';
import { registrar } from '../lib/rastreio';

interface Props {
  /** Número da empresa (só dígitos, com DDI). Vem de PUBLIC_WHATSAPP_NUMBER. */
  numeroWhatsApp: string;
  /** Serviço já escolhido (usado nas páginas de anúncio). */
  servicoInicial?: TipoServico;
}

interface Dados {
  nome: string;
  telefone: string;
  tipo_servico: TipoServico | '';
  bairro: string;
  mensagem: string;
}

const DADOS_VAZIOS: Dados = { nome: '', telefone: '', tipo_servico: '', bairro: '', mensagem: '' };

const classeCampo =
  'border-ebano-300 text-ebano-950 focus-visible:outline-carvalho-600 mt-1 block min-h-11 w-full rounded-lg border bg-white px-3 focus-visible:outline-2 focus-visible:outline-offset-1';
const classeBotao =
  'bg-carvalho-600 text-creme hover:bg-carvalho-700 focus-visible:outline-carvalho-600 inline-flex min-h-11 w-full items-center justify-center rounded-lg px-6 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60';

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <label className="text-ebano-800 block text-sm font-medium">
      {rotulo}
      {children}
    </label>
  );
}

/** Link do WhatsApp, ou `null` se o número não estiver configurado. */
function linkWhatsApp(numero: string, mensagem?: string): string | null {
  try {
    return montarLinkWhatsApp(numero, mensagem);
  } catch {
    return null;
  }
}

export default function FormularioOrcamento({ numeroWhatsApp, servicoInicial }: Props) {
  const [passo, setPasso] = useState<1 | 2>(1);
  const [dados, setDados] = useState<Dados>({
    ...DADOS_VAZIOS,
    tipo_servico: servicoInicial ?? '',
  });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [linkConcluido, setLinkConcluido] = useState<string | null | undefined>(undefined);

  const atualizar = (campo: keyof Dados) => (e: { target: { value: string } }) =>
    setDados((atual) => ({ ...atual, [campo]: e.target.value }));

  function avancar(evento: FormEvent) {
    evento.preventDefault();
    const parcial = leadSchema
      .pick({ nome: true, telefone: true })
      .safeParse({ nome: dados.nome, telefone: dados.telefone });
    if (!parcial.success) {
      setErro(parcial.error.issues[0]?.message ?? 'Confira seus dados.');
      return;
    }
    setErro(null);
    setPasso(2);
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    // Isca anti-spam: pessoas não veem este campo; robôs costumam preenchê-lo.
    const isca = new FormData(evento.currentTarget).get('site');
    if (isca) {
      setLinkConcluido(null);
      return;
    }

    const resultado = leadSchema.safeParse({
      nome: dados.nome,
      telefone: dados.telefone,
      tipo_servico: dados.tipo_servico,
      ...(dados.bairro.trim() && { bairro: dados.bairro }),
      ...(dados.mensagem.trim() && { mensagem: dados.mensagem }),
      ...lerOrigem(),
    });
    if (!resultado.success) {
      const campo = resultado.error.issues[0]?.path[0];
      setErro(
        campo === 'tipo_servico'
          ? 'Escolha o tipo de serviço.'
          : (resultado.error.issues[0]?.message ?? 'Confira seus dados.'),
      );
      return;
    }

    setEnviando(true);
    setErro(null);
    const lead = resultado.data;
    const link = linkWhatsApp(
      numeroWhatsApp,
      montarMensagemOrcamento({
        nome: lead.nome,
        tipo_servico: lead.tipo_servico,
        bairro: lead.bairro,
        mensagem: lead.mensagem,
      }),
    );

    // O cliente do Supabase é pesado: só é baixado na hora de enviar, não na entrada da página.
    let resposta: { error: unknown };
    try {
      const { supabase } = await import('../lib/supabase');
      resposta = supabase
        ? await supabase.from('leads').insert(lead)
        : { error: new Error('Supabase não configurado') };
    } catch (erroDeRede) {
      resposta = { error: erroDeRede };
    }
    setEnviando(false);

    if (resposta.error) {
      // Nunca falha em silêncio: avisa e oferece o caminho direto.
      setErro(
        'Não conseguimos registrar seu pedido agora. Tente de novo ou fale direto no WhatsApp.',
      );
      return;
    }

    setLinkConcluido(link);
    // Conversão para os anúncios (só é enviada à Meta se o visitante aceitou os cookies).
    registrar('Lead');
    // Pode ser bloqueado pelo navegador (não foi um clique); o botão abaixo cobre esse caso.
    if (link) window.open(link, '_blank', 'noopener');
  }

  if (linkConcluido !== undefined) {
    return (
      <div role="status" className="text-center">
        <h3 className="font-(family-name:--font-display) text-2xl">Recebemos o seu pedido!</h3>
        <p className="text-texto-suave mt-3">
          Entraremos em contato em breve. Se preferir, adiante a conversa pelo WhatsApp.
        </p>
        {linkConcluido && (
          <a
            href={linkConcluido}
            target="_blank"
            rel="noopener noreferrer"
            className={`${classeBotao} mt-6`}
          >
            Continuar no WhatsApp
          </a>
        )}
      </div>
    );
  }

  const linkDireto = linkWhatsApp(numeroWhatsApp, 'Olá! Gostaria de pedir um orçamento.');

  return (
    <form
      onSubmit={(e) => void (passo === 1 ? avancar(e) : enviar(e))}
      noValidate
      className="space-y-4"
    >
      <p className="text-texto-suave text-sm" aria-live="polite">
        Passo {passo} de 2
      </p>

      {/* Isca anti-spam, fora da tela e fora da ordem de tabulação. */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label>
          Não preencha este campo
          <input type="text" name="site" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {passo === 1 ? (
        <>
          <Campo rotulo="Seu nome">
            <input
              className={classeCampo}
              name="nome"
              autoComplete="name"
              value={dados.nome}
              onChange={atualizar('nome')}
              required
            />
          </Campo>
          <Campo rotulo="WhatsApp (com DDD)">
            <input
              className={classeCampo}
              name="telefone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="(61) 99999-9999"
              value={dados.telefone}
              onChange={atualizar('telefone')}
              required
            />
          </Campo>
        </>
      ) : (
        <>
          <Campo rotulo="O que você precisa?">
            <select
              className={classeCampo}
              name="tipo_servico"
              value={dados.tipo_servico}
              onChange={atualizar('tipo_servico')}
              required
            >
              <option value="">Selecione…</option>
              {TIPOS_SERVICO.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Bairro (opcional)">
            <input
              className={classeCampo}
              name="bairro"
              autoComplete="address-level2"
              value={dados.bairro}
              onChange={atualizar('bairro')}
            />
          </Campo>
          <Campo rotulo="Conte um pouco do projeto (opcional)">
            <textarea
              className={`${classeCampo} min-h-24 py-2`}
              name="mensagem"
              rows={3}
              maxLength={1000}
              value={dados.mensagem}
              onChange={atualizar('mensagem')}
            />
          </Campo>
        </>
      )}

      {erro && (
        <div role="alert" className="text-sm text-red-700">
          <p>{erro}</p>
          {linkDireto && passo === 2 && (
            <a href={linkDireto} className="mt-1 inline-block font-medium underline">
              Falar direto no WhatsApp
            </a>
          )}
        </div>
      )}

      <div className="flex gap-3">
        {passo === 2 && (
          <button
            type="button"
            onClick={() => {
              setErro(null);
              setPasso(1);
            }}
            className="text-carvalho-700 min-h-11 shrink-0 px-2 text-sm underline"
          >
            Voltar
          </button>
        )}
        <button type="submit" className={classeBotao} disabled={enviando}>
          {passo === 1 ? 'Continuar' : enviando ? 'Enviando…' : 'Pedir orçamento'}
        </button>
      </div>

      <p className="text-texto-suave text-xs">
        Usamos seus dados apenas para retornar o orçamento.
      </p>
    </form>
  );
}
