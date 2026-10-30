import {
  formatarBRL,
  formatarDataBR,
  origemDoLancamento,
  periodoDoAtalho,
  resumirCaixa,
  TODAS_AS_CATEGORIAS,
  type AtalhoPeriodo,
} from '@dk/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Campo } from '../../components/Campo';
import { Dialogo } from '../../components/Dialogo';
import {
  excluirLancamento,
  LIMITE_DE_LANCAMENTOS,
  listarLancamentos,
  mensagemDoCaixa,
} from './api';
import { FormularioLancamento } from './FormularioLancamento';
import type { LancamentoDoCaixa } from './tipos';

const classeBotao =
  'border-ebano-300 text-ebano-800 hover:bg-ebano-100 focus-visible:outline-carvalho-600 inline-flex min-h-11 items-center justify-center rounded-lg border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50';

const ATALHOS: { id: AtalhoPeriodo; rotulo: string }[] = [
  { id: 'mes', rotulo: 'Este mês' },
  { id: 'mes-passado', rotulo: 'Mês passado' },
  { id: 'ano', rotulo: 'Este ano' },
];

function Total({ rotulo, valor, negativo }: { rotulo: string; valor: number; negativo?: boolean }) {
  return (
    <div className="border-ebano-200 rounded-xl border bg-white p-4">
      <p className="text-texto-suave text-sm">{rotulo}</p>
      <p className={`mt-1 text-xl font-medium ${negativo ? 'text-red-700' : ''}`}>
        {formatarBRL(valor)}
      </p>
    </div>
  );
}

export function CaixaPage() {
  const queryClient = useQueryClient();
  const [periodo, setPeriodo] = useState(() => periodoDoAtalho('mes', new Date()));
  const [categoria, setCategoria] = useState('');
  const [formulario, setFormulario] = useState<{ lancamento: LancamentoDoCaixa | null } | null>(
    null,
  );
  const [excluindo, setExcluindo] = useState<LancamentoDoCaixa | null>(null);

  const filtro = { ...periodo, categoria };
  const consulta = useQuery({
    queryKey: ['caixa', filtro],
    queryFn: () => listarLancamentos(filtro),
  });

  const lancamentos = consulta.data ?? [];
  const resumo = resumirCaixa(lancamentos);
  const passouDoLimite = lancamentos.length >= LIMITE_DE_LANCAMENTOS;

  // Entradas de obra mexem no recebido da obra e no total pago do cliente.
  const recarregar = () =>
    Promise.all(
      ['caixa', 'obras', 'clientes'].map((chave) =>
        queryClient.invalidateQueries({ queryKey: [chave] }),
      ),
    );

  const excluir = useMutation({
    mutationFn: (lancamento: LancamentoDoCaixa) => excluirLancamento(lancamento.id),
    onSuccess: () => {
      setExcluindo(null);
      return recarregar();
    },
  });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-(family-name:--font-display) text-3xl">Caixa</h1>
          <p className="text-texto-suave mt-1" aria-live="polite">
            {consulta.isSuccess
              ? `${lancamentos.length} ${lancamentos.length === 1 ? 'lançamento' : 'lançamentos'}`
              : ' '}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormulario({ lancamento: null })}
          className="bg-carvalho-600 text-creme hover:bg-carvalho-700 inline-flex min-h-11 items-center rounded-lg px-6 font-medium"
        >
          Novo lançamento
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {ATALHOS.map((atalho) => (
          <button
            key={atalho.id}
            type="button"
            className={classeBotao}
            onClick={() => setPeriodo(periodoDoAtalho(atalho.id, new Date()))}
          >
            {atalho.rotulo}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Campo
          rotulo="De"
          name="de"
          type="date"
          value={periodo.de}
          onChange={(e) => setPeriodo({ ...periodo, de: e.target.value })}
        />
        <Campo
          rotulo="Até"
          name="ate"
          type="date"
          value={periodo.ate}
          onChange={(e) => setPeriodo({ ...periodo, ate: e.target.value })}
        />
        <div>
          <label htmlFor="filtro-categoria" className="text-ebano-800 block text-sm font-medium">
            Categoria
          </label>
          <select
            id="filtro-categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="border-ebano-300 focus-visible:outline-carvalho-600 mt-1 block min-h-11 w-full rounded-lg border bg-white px-3 focus-visible:outline-2"
          >
            <option value="">Todas</option>
            {TODAS_AS_CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {consulta.isSuccess && (
        <div className="mt-6 grid gap-3 sm:grid-cols-3" aria-label="Totais do período" role="group">
          <Total rotulo="Entradas" valor={resumo.entradas} />
          <Total rotulo="Saídas" valor={resumo.saidas} />
          <Total rotulo="Saldo" valor={resumo.saldo} negativo={resumo.saldo < 0} />
        </div>
      )}

      {passouDoLimite && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          O período tem {LIMITE_DE_LANCAMENTOS} lançamentos ou mais e os totais podem estar
          incompletos. Reduza o período.
        </p>
      )}
      {consulta.isPending && <p className="text-texto-suave mt-8">Carregando o caixa…</p>}
      {consulta.isError && (
        <div role="alert" className="mt-8 text-red-700">
          <p>Não foi possível carregar o caixa.</p>
          <button
            type="button"
            onClick={() => void consulta.refetch()}
            className={`${classeBotao} mt-3`}
          >
            Tentar de novo
          </button>
        </div>
      )}
      {consulta.isSuccess && lancamentos.length === 0 && (
        <p className="text-texto-suave mt-8">Nenhum lançamento neste período.</p>
      )}

      <ul className="mt-6 space-y-3">
        {lancamentos.map((lancamento) => {
          const origem = origemDoLancamento(lancamento);
          const titulo = lancamento.descricao ?? lancamento.categoria;
          return (
            <li
              key={lancamento.id}
              className="border-ebano-200 flex flex-col gap-3 rounded-xl border bg-white p-4 lg:flex-row lg:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-2">
                  <span className="font-medium break-words">{titulo}</span>
                  {origem !== 'manual' && (
                    <span className="bg-ouro-100 rounded-full px-2 py-0.5 text-xs">Automático</span>
                  )}
                </p>
                <p className="text-texto-suave mt-1 text-sm">
                  {formatarDataBR(lancamento.data)} · {lancamento.categoria}
                  {lancamento.services && ` · ${lancamento.services.descricao}`}
                </p>
              </div>
              <p
                className={`text-lg font-medium ${lancamento.tipo === 'saida' ? 'text-red-700' : 'text-green-800'}`}
              >
                {lancamento.tipo === 'saida' ? '−' : '+'} {formatarBRL(lancamento.valor)}
              </p>
              <div className="flex flex-wrap gap-2">
                {origem === 'manual' && (
                  <button
                    type="button"
                    className={classeBotao}
                    aria-label={`Editar: ${titulo}`}
                    onClick={() => setFormulario({ lancamento })}
                  >
                    Editar
                  </button>
                )}
                {origem === 'automatico' ? (
                  <Link to="/obras" className={classeBotao} aria-label={`Abrir obras: ${titulo}`}>
                    Gerir na obra
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={classeBotao}
                    aria-label={`Excluir: ${titulo}`}
                    onClick={() => {
                      excluir.reset();
                      setExcluindo(lancamento);
                    }}
                  >
                    Excluir
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <Dialogo
        aberto={formulario !== null}
        titulo={formulario?.lancamento ? 'Editar lançamento' : 'Novo lançamento'}
        aoFechar={() => setFormulario(null)}
      >
        {formulario && (
          <FormularioLancamento
            lancamento={formulario.lancamento}
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
        titulo="Excluir lançamento?"
        aoFechar={() => setExcluindo(null)}
      >
        {excluindo && (
          <div className="space-y-4">
            <p>
              {formatarBRL(excluindo.valor)} em {formatarDataBR(excluindo.data)} será removido do
              caixa.
              {origemDoLancamento(excluindo) === 'entrada-de-obra' &&
                ` O valor recebido da obra "${excluindo.services?.descricao ?? ''}" diminui na mesma quantia.`}{' '}
              Isso não pode ser desfeito.
            </p>
            {excluir.isError && (
              <p role="alert" className="text-sm text-red-700">
                {mensagemDoCaixa(excluir.error)}
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
