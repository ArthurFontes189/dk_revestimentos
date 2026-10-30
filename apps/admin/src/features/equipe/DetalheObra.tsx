import {
  alocacaoSchema,
  CATEGORIAS_INSUMO,
  formatarBRL,
  insumoSchema,
  totalDiarias,
} from '@dk/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Campo } from '../../components/Campo';
import type { Obra } from '../obras/tipos';
import {
  adicionarInsumo,
  alocarFuncionario,
  excluirInsumo,
  listarAlocacoes,
  listarFuncionarios,
  listarInsumos,
  marcarDiariaPaga,
  mensagemDaEquipe,
  removerAlocacao,
} from './api';

const classeBotao =
  'border-ebano-300 text-ebano-800 hover:bg-ebano-100 focus-visible:outline-carvalho-600 inline-flex min-h-11 items-center justify-center rounded-lg border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50';
const classeSelect =
  'border-ebano-300 focus-visible:outline-carvalho-600 mt-1 block min-h-11 w-full rounded-lg border bg-white px-3 focus-visible:outline-2';

const textoDoValor = (valor: number) => valor.toFixed(2).replace('.', ',');

/** Equipe e insumos de uma obra: o custo que alimenta o DRE e o caixa. */
export function DetalheObra({ obra }: { obra: Obra }) {
  const queryClient = useQueryClient();
  const alocacoes = useQuery({
    queryKey: ['alocacoes', obra.id],
    queryFn: () => listarAlocacoes(obra.id),
  });
  const insumos = useQuery({
    queryKey: ['insumos', obra.id],
    queryFn: () => listarInsumos(obra.id),
  });
  const funcionarios = useQuery({ queryKey: ['funcionarios'], queryFn: listarFuncionarios });

  const [funcionarioId, setFuncionarioId] = useState('');
  const [diaria, setDiaria] = useState('');
  const [dias, setDias] = useState('');
  const [categoria, setCategoria] = useState<string>(CATEGORIAS_INSUMO[0]);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [lancar, setLancar] = useState(true);
  const [erroForm, setErroForm] = useState<string | null>(null);

  // Obra, caixa, clientes e custos mudam juntos quando uma diária ou um insumo muda.
  const recarregar = () =>
    Promise.all(
      ['alocacoes', 'insumos', 'obras', 'clientes'].map((chave) =>
        queryClient.invalidateQueries({ queryKey: [chave] }),
      ),
    );

  const alocar = useMutation({
    mutationFn: (dados: Parameters<typeof alocarFuncionario>[1]) =>
      alocarFuncionario(obra.id, dados),
    onSuccess: () => {
      setFuncionarioId('');
      setDiaria('');
      setDias('');
      return recarregar();
    },
  });
  const remover = useMutation({ mutationFn: removerAlocacao, onSuccess: recarregar });
  const pagar = useMutation({
    mutationFn: ({ id, pago }: { id: number; pago: boolean }) => marcarDiariaPaga(id, pago),
    onSuccess: recarregar,
  });
  const novoInsumo = useMutation({
    mutationFn: (dados: Parameters<typeof adicionarInsumo>[1]) => adicionarInsumo(obra.id, dados),
    onSuccess: () => {
      setDescricao('');
      setValor('');
      return recarregar();
    },
  });
  const apagarInsumo = useMutation({ mutationFn: excluirInsumo, onSuccess: recarregar });

  const ativosLivres = (funcionarios.data ?? []).filter(
    (f) => f.ativo && !(alocacoes.data ?? []).some((a) => a.employee_id === f.id),
  );

  function escolherFuncionario(id: string) {
    setFuncionarioId(id);
    const escolhido = ativosLivres.find((f) => String(f.id) === id);
    // Sugere a diária padrão, mas a alocação guarda o próprio valor.
    if (escolhido) setDiaria(escolhido.diaria_padrao ? textoDoValor(escolhido.diaria_padrao) : '');
  }

  function enviarAlocacao(evento: FormEvent) {
    evento.preventDefault();
    setErroForm(null);
    const dados = alocacaoSchema.safeParse({
      employee_id: Number(funcionarioId),
      valor_diaria: diaria,
      dias_trabalhados: dias,
    });
    if (!dados.success) {
      setErroForm(dados.error.issues[0]?.message ?? 'Confira os campos.');
      return;
    }
    alocar.mutate(dados.data);
  }

  function enviarInsumo(evento: FormEvent) {
    evento.preventDefault();
    setErroForm(null);
    const dados = insumoSchema.safeParse({
      categoria,
      descricao,
      valor,
      lancar_no_caixa: lancar,
    });
    if (!dados.success) {
      setErroForm(dados.error.issues[0]?.message ?? 'Confira os campos.');
      return;
    }
    novoInsumo.mutate(dados.data);
  }

  const falha =
    alocar.error ?? remover.error ?? pagar.error ?? novoInsumo.error ?? apagarInsumo.error;

  return (
    <div className="space-y-8">
      {(erroForm ?? falha) && (
        <p role="alert" className="text-sm text-red-700">
          {erroForm ?? mensagemDaEquipe(falha)}
        </p>
      )}

      <section aria-labelledby="titulo-equipe-obra">
        <h3 id="titulo-equipe-obra" className="font-medium">
          Equipe da obra
        </h3>
        {alocacoes.isPending && <p className="text-texto-suave mt-2 text-sm">Carregando…</p>}
        {alocacoes.isSuccess && alocacoes.data.length === 0 && (
          <p className="text-texto-suave mt-2 text-sm">Ninguém alocado ainda.</p>
        )}
        <ul className="mt-2 space-y-2">
          {(alocacoes.data ?? []).map((a) => {
            const nome = a.employees?.nome ?? 'Funcionário';
            return (
              <li key={a.id} className="border-ebano-200 rounded-lg border bg-white p-3 text-sm">
                <p className="font-medium">{nome}</p>
                <p className="text-texto-suave">
                  {formatarBRL(a.valor_diaria)} × {a.dias_trabalhados}{' '}
                  {a.dias_trabalhados === 1 ? 'dia' : 'dias'} ={' '}
                  {formatarBRL(totalDiarias(a.valor_diaria, a.dias_trabalhados))}
                  {a.pago && ' · Pago'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={classeBotao}
                    disabled={pagar.isPending}
                    aria-label={`${a.pago ? 'Desmarcar pagamento' : 'Marcar como pago'}: ${nome}`}
                    onClick={() => pagar.mutate({ id: a.id, pago: !a.pago })}
                  >
                    {a.pago ? 'Desmarcar pagamento' : 'Marcar como pago'}
                  </button>
                  <button
                    type="button"
                    className={classeBotao}
                    disabled={remover.isPending}
                    aria-label={`Remover da obra: ${nome}`}
                    onClick={() => remover.mutate(a.id)}
                  >
                    Remover
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <form onSubmit={enviarAlocacao} className="mt-4 space-y-3" noValidate>
          <div>
            <label htmlFor="funcionario-obra" className="text-ebano-800 block text-sm font-medium">
              Funcionário
            </label>
            <select
              id="funcionario-obra"
              value={funcionarioId}
              onChange={(e) => escolherFuncionario(e.target.value)}
              className={classeSelect}
            >
              <option value="">Escolha quem vai trabalhar</option>
              {ativosLivres.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo
              rotulo="Diária (R$)"
              name="valor_diaria"
              inputMode="decimal"
              value={diaria}
              onChange={(e) => setDiaria(e.target.value)}
              autoComplete="off"
            />
            <Campo
              rotulo="Dias trabalhados"
              name="dias_trabalhados"
              inputMode="numeric"
              value={dias}
              onChange={(e) => setDias(e.target.value)}
              autoComplete="off"
            />
          </div>
          <button type="submit" disabled={alocar.isPending} className={classeBotao}>
            {alocar.isPending ? 'Alocando…' : 'Alocar na obra'}
          </button>
        </form>
      </section>

      <section aria-labelledby="titulo-insumos-obra">
        <h3 id="titulo-insumos-obra" className="font-medium">
          Insumos
        </h3>
        {insumos.isPending && <p className="text-texto-suave mt-2 text-sm">Carregando…</p>}
        {insumos.isSuccess && insumos.data.length === 0 && (
          <p className="text-texto-suave mt-2 text-sm">Nenhum insumo lançado.</p>
        )}
        <ul className="mt-2 space-y-2">
          {(insumos.data ?? []).map((i) => (
            <li
              key={i.id}
              className="border-ebano-200 flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white p-3 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium break-words">{i.descricao}</p>
                <p className="text-texto-suave">
                  {i.categoria} · {formatarBRL(i.valor)}
                  {i.transactions.length > 0 && ' · Lançado no caixa'}
                </p>
              </div>
              <button
                type="button"
                className={classeBotao}
                disabled={apagarInsumo.isPending}
                aria-label={`Excluir insumo: ${i.descricao}`}
                onClick={() => apagarInsumo.mutate(i.id)}
              >
                Excluir
              </button>
            </li>
          ))}
        </ul>

        <form onSubmit={enviarInsumo} className="mt-4 space-y-3" noValidate>
          <div>
            <label htmlFor="categoria-insumo" className="text-ebano-800 block text-sm font-medium">
              Categoria
            </label>
            <select
              id="categoria-insumo"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className={classeSelect}
            >
              {CATEGORIAS_INSUMO.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <Campo
            rotulo="Descrição do insumo"
            name="descricao_insumo"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            autoComplete="off"
          />
          <Campo
            rotulo="Valor do insumo (R$)"
            name="valor_insumo"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            autoComplete="off"
          />
          <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={lancar}
              onChange={(e) => setLancar(e.target.checked)}
              className="size-5"
            />
            Lançar no caixa como saída
          </label>
          <button type="submit" disabled={novoInsumo.isPending} className={classeBotao}>
            {novoInsumo.isPending ? 'Adicionando…' : 'Adicionar insumo'}
          </button>
        </form>
      </section>
    </div>
  );
}
