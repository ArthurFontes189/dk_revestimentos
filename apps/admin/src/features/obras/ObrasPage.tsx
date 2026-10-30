import { calcularDre, formatarBRL, STATUS_OBRA } from '@dk/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Dialogo } from '../../components/Dialogo';
import {
  excluirObra,
  listarObras,
  mensagemDaObra,
  mudarStatusObra,
  registrarRecebimento,
} from './api';
import { FormularioObra } from './FormularioObra';
import type { Obra } from './tipos';

const classeBotao =
  'border-ebano-300 text-ebano-800 hover:bg-ebano-100 focus-visible:outline-carvalho-600 inline-flex min-h-11 items-center justify-center rounded-lg border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50';

const formatarData = (iso: string) => iso.split('-').reverse().join('/');

export function ObrasPage() {
  const queryClient = useQueryClient();
  const consulta = useQuery({ queryKey: ['obras'], queryFn: listarObras });
  const [filtro, setFiltro] = useState('');
  const [formulario, setFormulario] = useState<{ obra: Obra | null } | null>(null);
  const [excluindo, setExcluindo] = useState<Obra | null>(null);

  const obras = consulta.data ?? [];
  const visiveis = filtro ? obras.filter((o) => o.status === filtro) : obras;
  // Os totais da página Clientes vêm das obras e do caixa, então também precisam recarregar.
  const recarregar = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['obras'] }),
      queryClient.invalidateQueries({ queryKey: ['clientes'] }),
    ]);

  const excluir = useMutation({
    mutationFn: (obra: Obra) => excluirObra(obra.id),
    onSuccess: () => {
      setExcluindo(null);
      return recarregar();
    },
  });
  const mudarStatus = useMutation({
    mutationFn: ({ obra, status }: { obra: Obra; status: Obra['status'] }) =>
      mudarStatusObra(obra.id, status),
    onSuccess: recarregar,
  });
  const receber = useMutation({
    mutationFn: (obra: Obra) => registrarRecebimento(obra.id, obra.saldo),
    onSuccess: recarregar,
  });

  const falha = mudarStatus.error ?? receber.error;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-(family-name:--font-display) text-3xl">Obras</h1>
          <p className="text-texto-suave mt-1" aria-live="polite">
            {consulta.isSuccess ? `${obras.length} ${obras.length === 1 ? 'obra' : 'obras'}` : ' '}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormulario({ obra: null })}
          className="bg-carvalho-600 text-creme hover:bg-carvalho-700 inline-flex min-h-11 items-center rounded-lg px-6 font-medium"
        >
          Nova obra
        </button>
      </div>

      <div className="mt-4">
        <label htmlFor="filtro-status" className="text-ebano-800 block text-sm font-medium">
          Filtrar por status
        </label>
        <select
          id="filtro-status"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="border-ebano-300 focus-visible:outline-carvalho-600 mt-1 block min-h-11 w-full rounded-lg border bg-white px-3 focus-visible:outline-2 sm:max-w-md"
        >
          <option value="">Todos</option>
          {STATUS_OBRA.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {consulta.isPending && <p className="text-texto-suave mt-8">Carregando obras…</p>}
      {consulta.isError && (
        <div role="alert" className="mt-8 text-red-700">
          <p>Não foi possível carregar as obras.</p>
          <button
            type="button"
            onClick={() => void consulta.refetch()}
            className={`${classeBotao} mt-3`}
          >
            Tentar de novo
          </button>
        </div>
      )}
      {falha && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {mensagemDaObra(falha)}
        </p>
      )}
      {consulta.isSuccess && obras.length === 0 && (
        <p className="text-texto-suave mt-8">
          Nenhuma obra ainda. Use &quot;Nova obra&quot; para criar a primeira ficha.
        </p>
      )}
      {consulta.isSuccess && obras.length > 0 && visiveis.length === 0 && (
        <p className="text-texto-suave mt-8">Nenhuma obra com este status.</p>
      )}

      <ul className="mt-6 space-y-3">
        {visiveis.map((obra) => {
          // Diárias e insumos só existem na E7: até lá o custo é zero, sem número inventado.
          const dre = calcularDre({ valorTotal: obra.valor_total, diarias: [], insumos: [] });
          return (
            <li key={obra.id} className="border-ebano-200 rounded-xl border bg-white p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                <div className="min-w-0 flex-1">
                  <p className="font-medium break-words">{obra.descricao}</p>
                  <p className="text-texto-suave mt-1 text-sm">
                    Total {formatarBRL(obra.valor_total)} · Recebido{' '}
                    {formatarBRL(obra.valor_recebido)} · Saldo {formatarBRL(obra.saldo)}
                  </p>
                  <p className="text-texto-suave text-sm">
                    Lucro previsto {formatarBRL(dre.lucroPrevisto)} ({dre.margemPercentual}%)
                    {obra.data_entrega && ` · Entrega ${formatarData(obra.data_entrega)}`}
                    {obra.responsavel && ` · ${obra.responsavel}`}
                  </p>
                  {obra.materiais && (
                    <p className="mt-1 text-sm break-words whitespace-pre-line">{obra.materiais}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    aria-label={`Status: ${obra.descricao}`}
                    value={obra.status}
                    disabled={mudarStatus.isPending}
                    onChange={(e) =>
                      mudarStatus.mutate({ obra, status: e.target.value as Obra['status'] })
                    }
                    className="border-ebano-300 min-h-11 rounded-lg border bg-white px-3 text-sm"
                  >
                    {STATUS_OBRA.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {obra.saldo > 0 && (
                    <button
                      type="button"
                      className={classeBotao}
                      disabled={receber.isPending}
                      aria-label={`Quitar saldo: ${obra.descricao}`}
                      onClick={() => receber.mutate(obra)}
                    >
                      Quitar saldo
                    </button>
                  )}
                  <button
                    type="button"
                    className={classeBotao}
                    aria-label={`Editar: ${obra.descricao}`}
                    onClick={() => setFormulario({ obra })}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className={classeBotao}
                    aria-label={`Excluir: ${obra.descricao}`}
                    onClick={() => {
                      excluir.reset();
                      setExcluindo(obra);
                    }}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <Dialogo
        aberto={formulario !== null}
        titulo={formulario?.obra ? 'Editar obra' : 'Nova obra'}
        aoFechar={() => setFormulario(null)}
      >
        {formulario && (
          <FormularioObra
            obra={formulario.obra}
            aoCancelar={() => setFormulario(null)}
            aoConcluir={() => {
              setFormulario(null);
              void recarregar();
            }}
          />
        )}
      </Dialogo>

      <Dialogo
        aberto={excluindo !== null}
        titulo="Excluir obra?"
        aoFechar={() => setExcluindo(null)}
      >
        {excluindo && (
          <div className="space-y-4">
            <p>
              &quot;{excluindo.descricao}&quot; será removida
              {excluindo.valor_recebido > 0
                ? `, junto com ${formatarBRL(excluindo.valor_recebido)} já recebidos que saem do caixa`
                : ''}
              . Isso não pode ser desfeito.
            </p>
            {excluir.isError && (
              <p role="alert" className="text-sm text-red-700">
                {mensagemDaObra(excluir.error)}
              </p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <button
                type="button"
                disabled={excluir.isPending}
                onClick={() => excluir.mutate(excluindo)}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-red-700 px-6 font-medium text-white disabled:opacity-60"
              >
                {excluir.isPending ? 'Excluindo…' : 'Excluir definitivamente'}
              </button>
              <button
                type="button"
                onClick={() => setExcluindo(null)}
                className={`${classeBotao} w-full`}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </Dialogo>
    </div>
  );
}
