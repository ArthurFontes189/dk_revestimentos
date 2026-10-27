import {
  contarPendentes,
  filtrarPorStatus,
  formatarTelefoneBR,
  montarLinkWhatsApp,
  STATUS_LEAD,
  type FiltroStatus,
  type StatusLead,
} from '@dk/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { atualizarStatusLead, excluirLead, listarLeads } from './api';
import type { Lead } from './tipos';

const FILTROS: readonly FiltroStatus[] = ['Todos', ...STATUS_LEAD];

const classeBotaoSecundario =
  'border-ebano-300 text-ebano-800 hover:bg-ebano-100 focus-visible:outline-carvalho-600 inline-flex min-h-11 items-center justify-center rounded-lg border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2';

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/** Link do WhatsApp do lead, ou `null` se o telefone for inválido. */
function linkDoLead(lead: Lead): string | null {
  try {
    return montarLinkWhatsApp(lead.telefone, `Olá, ${lead.nome}! Aqui é da DK Revestimentos.`);
  } catch {
    return null;
  }
}

function Informacao({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  if (!valor) return null;
  return (
    <div>
      <dt className="text-texto-suave text-xs tracking-wide uppercase">{rotulo}</dt>
      <dd className="mt-0.5 break-words whitespace-pre-line">{valor}</dd>
    </div>
  );
}

function CartaoLead({
  lead,
  selecionado,
  aoEscolher,
}: {
  lead: Lead;
  selecionado: boolean;
  aoEscolher: () => void;
}) {
  return (
    <button
      type="button"
      onClick={aoEscolher}
      aria-current={selecionado}
      className={`focus-visible:outline-carvalho-600 w-full rounded-lg border p-3 text-left focus-visible:outline-2 ${
        selecionado ? 'border-carvalho-600 bg-carvalho-50' : 'border-ebano-200 bg-white'
      }`}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="font-medium">{lead.nome}</span>
        <span className="text-texto-suave shrink-0 text-xs">{formatarData(lead.created_at)}</span>
      </span>
      <span className="text-texto-suave mt-1 block text-sm">{lead.tipo_servico}</span>
      <span
        className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${
          lead.status === 'Pendente de Contato'
            ? 'bg-ouro-100 text-ebano-950'
            : 'bg-ebano-100 text-ebano-800'
        }`}
      >
        {lead.status}
      </span>
    </button>
  );
}

function DetalheLead({ lead, aoVoltar }: { lead: Lead; aoVoltar: () => void }) {
  const clienteQuery = useQueryClient();
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  const mudarStatus = useMutation({
    mutationFn: (status: StatusLead) => atualizarStatusLead(lead.id, status),
    onSuccess: () => clienteQuery.invalidateQueries({ queryKey: ['leads'] }),
  });
  const excluir = useMutation({
    mutationFn: () => excluirLead(lead.id),
    onSuccess: () => {
      aoVoltar();
      return clienteQuery.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const whatsapp = linkDoLead(lead);
  const erro = mudarStatus.error ?? excluir.error;

  return (
    <article className="border-ebano-200 rounded-lg border bg-white p-4 md:p-6">
      <button
        type="button"
        onClick={aoVoltar}
        className={`${classeBotaoSecundario} mb-4 md:hidden`}
      >
        ← Voltar para a lista
      </button>

      <h2 className="font-(family-name:--font-display) text-2xl">{lead.nome}</h2>
      <p className="text-texto-suave mt-1 text-sm">Recebido em {formatarData(lead.created_at)}</p>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <Informacao rotulo="Telefone" valor={formatarTelefoneBR(lead.telefone)} />
        <Informacao rotulo="Serviço" valor={lead.tipo_servico} />
        <Informacao rotulo="Bairro" valor={lead.bairro} />
        <Informacao rotulo="Detalhes" valor={lead.mensagem} />
        <Informacao rotulo="Origem" valor={lead.utm_source} />
        <Informacao rotulo="Mídia" valor={lead.utm_medium} />
        <Informacao rotulo="Campanha" valor={lead.utm_campaign} />
        <Informacao rotulo="Página de entrada" valor={lead.pagina_entrada} />
      </dl>

      <div className="mt-6">
        <label htmlFor="status-lead" className="text-ebano-800 block text-sm font-medium">
          Status
        </label>
        <select
          id="status-lead"
          value={lead.status}
          disabled={mudarStatus.isPending}
          onChange={(e) => mudarStatus.mutate(e.target.value as StatusLead)}
          className="border-ebano-300 focus-visible:outline-carvalho-600 mt-1 block min-h-11 w-full rounded-lg border bg-white px-3 focus-visible:outline-2 sm:max-w-xs"
        >
          {STATUS_LEAD.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {erro && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          Não foi possível salvar a alteração. Tente de novo.
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-carvalho-600 text-creme hover:bg-carvalho-700 focus-visible:outline-carvalho-600 inline-flex min-h-11 items-center rounded-lg px-6 font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Chamar no WhatsApp
          </a>
        )}
        {confirmandoExclusao ? (
          <>
            <button
              type="button"
              disabled={excluir.isPending}
              onClick={() => excluir.mutate()}
              className="inline-flex min-h-11 items-center rounded-lg bg-red-700 px-4 text-sm font-medium text-white disabled:opacity-60"
            >
              {excluir.isPending ? 'Excluindo…' : 'Confirmar exclusão'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmandoExclusao(false)}
              className={classeBotaoSecundario}
            >
              Cancelar
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmandoExclusao(true)}
            className={classeBotaoSecundario}
          >
            Excluir lead
          </button>
        )}
      </div>
    </article>
  );
}

export function LeadsPage() {
  const consulta = useQuery({ queryKey: ['leads'], queryFn: listarLeads });
  const [filtro, setFiltro] = useState<FiltroStatus>('Todos');
  const [selecionadoId, setSelecionadoId] = useState<number | null>(null);

  const leads = consulta.data ?? [];
  const visiveis = filtrarPorStatus(leads, filtro);
  const selecionado = leads.find((lead) => lead.id === selecionadoId) ?? null;
  const pendentes = contarPendentes(leads);

  return (
    <div className="mx-auto max-w-6xl">
      {/* No celular, com um lead aberto, o detalhe ocupa a tela toda (sem título nem filtros). */}
      <div className={selecionado ? 'hidden md:block' : ''}>
        <h1 className="font-(family-name:--font-display) text-3xl">Leads</h1>
        <p className="text-texto-suave mt-1" aria-live="polite">
          {consulta.isSuccess
            ? pendentes === 1
              ? '1 lead aguardando contato'
              : `${pendentes} leads aguardando contato`
            : ' '}
        </p>

        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filtrar por status">
          {FILTROS.map((opcao) => {
            const ativo = filtro === opcao;
            const total = opcao === 'Todos' ? leads.length : filtrarPorStatus(leads, opcao).length;
            return (
              <button
                key={opcao}
                type="button"
                aria-pressed={ativo}
                onClick={() => setFiltro(opcao)}
                className={`focus-visible:outline-carvalho-600 min-h-11 rounded-full border px-4 text-sm focus-visible:outline-2 ${
                  ativo
                    ? 'border-carvalho-600 bg-carvalho-600 text-creme'
                    : 'border-ebano-300 bg-white'
                }`}
              >
                {opcao} ({total})
              </button>
            );
          })}
        </div>
      </div>

      {consulta.isPending && <p className="text-texto-suave mt-8">Carregando leads…</p>}

      {consulta.isError && (
        <div role="alert" className="mt-8 text-red-700">
          <p>Não foi possível carregar os leads.</p>
          <button
            type="button"
            onClick={() => void consulta.refetch()}
            className={`${classeBotaoSecundario} mt-3`}
          >
            Tentar de novo
          </button>
        </div>
      )}

      {consulta.isSuccess && (
        <div className="mt-6 md:grid md:grid-cols-[minmax(0,22rem)_1fr] md:items-start md:gap-6">
          {/* No celular a lista e o detalhe se alternam; no computador aparecem lado a lado. */}
          <section
            aria-label="Lista de leads"
            className={`space-y-2 ${selecionado ? 'hidden md:block' : ''}`}
          >
            {visiveis.length === 0 ? (
              <p className="text-texto-suave">
                {leads.length === 0
                  ? 'Nenhum lead ainda. Quando alguém pedir um orçamento no site, ele aparece aqui.'
                  : 'Nenhum lead neste filtro.'}
              </p>
            ) : (
              visiveis.map((lead) => (
                <CartaoLead
                  key={lead.id}
                  lead={lead}
                  selecionado={lead.id === selecionadoId}
                  aoEscolher={() => setSelecionadoId(lead.id)}
                />
              ))
            )}
          </section>

          <section className={selecionado ? '' : 'hidden md:block'}>
            {selecionado ? (
              <DetalheLead lead={selecionado} aoVoltar={() => setSelecionadoId(null)} />
            ) : (
              <p className="text-texto-suave hidden md:block">
                Escolha um lead para ver os detalhes.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
