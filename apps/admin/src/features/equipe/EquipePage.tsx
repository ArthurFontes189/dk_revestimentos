import { formatarBRL, formatarTelefoneBR, montarLinkWhatsApp } from '@dk/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Dialogo } from '../../components/Dialogo';
import {
  enviarContrato,
  excluirFuncionario,
  listarFuncionarios,
  mensagemDaEquipe,
  removerContratoDoFuncionario,
  urlDoContrato,
  validarContrato,
} from './api';
import { FormularioFuncionario } from './FormularioFuncionario';
import type { Funcionario } from './tipos';

const classeBotao =
  'border-ebano-300 text-ebano-800 hover:bg-ebano-100 focus-visible:outline-carvalho-600 inline-flex min-h-11 items-center justify-center rounded-lg border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50';

type Filtro = 'todos' | 'ativos' | 'inativos';

/** Link do WhatsApp do funcionário, ou `null` sem telefone válido. */
function linkDoFuncionario(funcionario: Funcionario): string | null {
  if (!funcionario.telefone) return null;
  try {
    return montarLinkWhatsApp(funcionario.telefone, `Olá, ${funcionario.nome}!`);
  } catch {
    return null;
  }
}

export function EquipePage() {
  const queryClient = useQueryClient();
  const consulta = useQuery({ queryKey: ['funcionarios'], queryFn: listarFuncionarios });
  const [filtro, setFiltro] = useState<Filtro>('ativos');
  const [formulario, setFormulario] = useState<{ funcionario: Funcionario | null } | null>(null);
  const [excluindo, setExcluindo] = useState<Funcionario | null>(null);
  const [erroContrato, setErroContrato] = useState<string | null>(null);
  const seletorContrato = useRef<HTMLInputElement>(null);
  const [alvoContrato, setAlvoContrato] = useState<Funcionario | null>(null);

  const funcionarios = consulta.data ?? [];
  const visiveis = funcionarios.filter(
    (f) => filtro === 'todos' || (filtro === 'ativos' ? f.ativo : !f.ativo),
  );
  const recarregar = () => queryClient.invalidateQueries({ queryKey: ['funcionarios'] });

  const excluir = useMutation({
    mutationFn: excluirFuncionario,
    onSuccess: () => {
      setExcluindo(null);
      return recarregar();
    },
  });
  const enviar = useMutation({
    mutationFn: ({ funcionario, arquivo }: { funcionario: Funcionario; arquivo: File }) =>
      enviarContrato(funcionario, arquivo),
    onSuccess: recarregar,
  });
  const apagarContrato = useMutation({
    mutationFn: removerContratoDoFuncionario,
    onSuccess: recarregar,
  });

  function escolherArquivo(arquivo: File | undefined) {
    setErroContrato(null);
    if (!arquivo || !alvoContrato) return;
    const motivo = validarContrato(arquivo);
    if (motivo) {
      setErroContrato(motivo);
      return;
    }
    enviar.mutate({ funcionario: alvoContrato, arquivo });
  }

  /** A janela abre no mesmo clique (antes da rede) e recebe a URL assinada depois: o iOS bloqueia popup tardio. */
  async function abrirContrato(caminho: string) {
    setErroContrato(null);
    const janela = window.open('', '_blank');
    try {
      const url = await urlDoContrato(caminho);
      if (janela) {
        janela.opener = null;
        janela.location.href = url;
      } else window.location.assign(url);
    } catch (falha) {
      janela?.close();
      setErroContrato(mensagemDaEquipe(falha));
    }
  }

  const falha = enviar.error ?? apagarContrato.error;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-(family-name:--font-display) text-3xl">Equipe</h1>
          <p className="text-texto-suave mt-1" aria-live="polite">
            {consulta.isSuccess
              ? `${funcionarios.length} ${funcionarios.length === 1 ? 'pessoa' : 'pessoas'}`
              : ' '}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormulario({ funcionario: null })}
          className="bg-carvalho-600 text-creme hover:bg-carvalho-700 inline-flex min-h-11 items-center rounded-lg px-6 font-medium"
        >
          Novo funcionário
        </button>
      </div>

      <div className="mt-4">
        <label htmlFor="filtro-equipe" className="text-ebano-800 block text-sm font-medium">
          Mostrar
        </label>
        <select
          id="filtro-equipe"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as Filtro)}
          className="border-ebano-300 focus-visible:outline-carvalho-600 mt-1 block min-h-11 w-full rounded-lg border bg-white px-3 focus-visible:outline-2 sm:max-w-md"
        >
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
          <option value="todos">Todos</option>
        </select>
      </div>

      <input
        ref={seletorContrato}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        aria-label="Arquivo do contrato"
        className="sr-only"
        onChange={(e) => {
          escolherArquivo(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {consulta.isPending && <p className="text-texto-suave mt-8">Carregando equipe…</p>}
      {consulta.isError && (
        <div role="alert" className="mt-8 text-red-700">
          <p>Não foi possível carregar a equipe.</p>
          <button
            type="button"
            onClick={() => void consulta.refetch()}
            className={`${classeBotao} mt-3`}
          >
            Tentar de novo
          </button>
        </div>
      )}
      {(erroContrato ?? falha) && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {erroContrato ?? mensagemDaEquipe(falha)}
        </p>
      )}
      {consulta.isSuccess && funcionarios.length === 0 && (
        <p className="text-texto-suave mt-8">
          Ninguém cadastrado ainda. Use &quot;Novo funcionário&quot;.
        </p>
      )}
      {consulta.isSuccess && funcionarios.length > 0 && visiveis.length === 0 && (
        <p className="text-texto-suave mt-8">Ninguém neste filtro.</p>
      )}

      <ul className="mt-6 space-y-3">
        {visiveis.map((funcionario) => {
          const whatsapp = linkDoFuncionario(funcionario);
          return (
            <li
              key={funcionario.id}
              className="border-ebano-200 flex flex-col gap-3 rounded-xl border bg-white p-4 lg:flex-row lg:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-2">
                  <span className="font-medium">{funcionario.nome}</span>
                  {funcionario.cargo && (
                    <span className="bg-ebano-100 rounded-full px-2 py-0.5 text-xs">
                      {funcionario.cargo}
                    </span>
                  )}
                  {!funcionario.ativo && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">
                      Inativo
                    </span>
                  )}
                </p>
                <p className="text-texto-suave mt-1 text-sm">
                  Diária padrão {formatarBRL(funcionario.diaria_padrao)}
                  {funcionario.telefone && ` · ${formatarTelefoneBR(funcionario.telefone)}`}
                </p>
                {funcionario.chave_pix && (
                  <p className="text-texto-suave text-sm break-words">
                    PIX {funcionario.chave_pix}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {funcionario.contrato_path ? (
                  <>
                    <button
                      type="button"
                      className={classeBotao}
                      aria-label={`Ver contrato: ${funcionario.nome}`}
                      onClick={() => void abrirContrato(funcionario.contrato_path!)}
                    >
                      Ver contrato
                    </button>
                    <button
                      type="button"
                      className={classeBotao}
                      disabled={apagarContrato.isPending}
                      aria-label={`Remover contrato: ${funcionario.nome}`}
                      onClick={() => apagarContrato.mutate(funcionario)}
                    >
                      Remover contrato
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className={classeBotao}
                    disabled={enviar.isPending}
                    aria-label={`Anexar contrato: ${funcionario.nome}`}
                    onClick={() => {
                      setAlvoContrato(funcionario);
                      seletorContrato.current?.click();
                    }}
                  >
                    {enviar.isPending && alvoContrato?.id === funcionario.id
                      ? 'Enviando…'
                      : 'Anexar contrato'}
                  </button>
                )}
                {whatsapp && (
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`WhatsApp: ${funcionario.nome}`}
                    className={classeBotao}
                  >
                    WhatsApp
                  </a>
                )}
                <button
                  type="button"
                  className={classeBotao}
                  aria-label={`Editar: ${funcionario.nome}`}
                  onClick={() => setFormulario({ funcionario })}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className={classeBotao}
                  aria-label={`Excluir: ${funcionario.nome}`}
                  onClick={() => {
                    excluir.reset();
                    setExcluindo(funcionario);
                  }}
                >
                  Excluir
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <Dialogo
        aberto={formulario !== null}
        titulo={formulario?.funcionario ? 'Editar funcionário' : 'Novo funcionário'}
        aoFechar={() => setFormulario(null)}
      >
        {formulario && (
          <FormularioFuncionario
            funcionario={formulario.funcionario}
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
        titulo="Excluir funcionário?"
        aoFechar={() => setExcluindo(null)}
      >
        {excluindo && (
          <div className="space-y-4">
            <p>
              &quot;{excluindo.nome}&quot; será removido
              {excluindo.contrato_path ? ', junto com o contrato anexado' : ''}. Se ele já foi
              alocado em alguma obra, desative-o em vez de excluir.
            </p>
            {excluir.isError && (
              <p role="alert" className="text-sm text-red-700">
                {mensagemDaEquipe(excluir.error)}
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
