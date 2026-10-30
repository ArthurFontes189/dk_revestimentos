import {
  buscarClientes,
  formatarBRL,
  formatarCpf,
  formatarTelefoneBR,
  montarLinkWhatsApp,
} from '@dk/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Dialogo } from '../../components/Dialogo';
import { excluirCliente, listarClientes, listarTotaisPorCliente, mensagemDoCliente } from './api';
import { FormularioCliente } from './FormularioCliente';
import type { Cliente } from './tipos';

const classeBotao =
  'border-ebano-300 text-ebano-800 hover:bg-ebano-100 focus-visible:outline-carvalho-600 inline-flex min-h-11 items-center justify-center rounded-lg border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50';

/** Link do WhatsApp do cliente, ou `null` se o telefone for inválido. */
function linkDoCliente(cliente: Cliente): string | null {
  try {
    return montarLinkWhatsApp(
      cliente.telefone,
      `Olá, ${cliente.nome}! Aqui é da DK Revestimentos.`,
    );
  } catch {
    return null;
  }
}

export function ClientesPage() {
  const clienteQuery = useQueryClient();
  const consulta = useQuery({ queryKey: ['clientes'], queryFn: listarClientes });
  // Totais são um extra: se falharem, a lista de clientes continua funcionando sem eles.
  const totais = useQuery({ queryKey: ['clientes', 'totais'], queryFn: listarTotaisPorCliente });
  const [busca, setBusca] = useState('');
  const [formulario, setFormulario] = useState<{ cliente: Cliente | null } | null>(null);
  const [excluindo, setExcluindo] = useState<Cliente | null>(null);

  const clientes = consulta.data ?? [];
  const visiveis = buscarClientes(clientes, busca);
  const recarregar = () => clienteQuery.invalidateQueries({ queryKey: ['clientes'] });

  const excluir = useMutation({
    mutationFn: (cliente: Cliente) => excluirCliente(cliente.id),
    onSuccess: () => {
      setExcluindo(null);
      return recarregar();
    },
  });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-(family-name:--font-display) text-3xl">Clientes</h1>
          <p className="text-texto-suave mt-1" aria-live="polite">
            {consulta.isSuccess
              ? `${clientes.length} ${clientes.length === 1 ? 'cliente' : 'clientes'}`
              : ' '}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormulario({ cliente: null })}
          className="bg-carvalho-600 text-creme hover:bg-carvalho-700 inline-flex min-h-11 items-center rounded-lg px-6 font-medium"
        >
          Novo cliente
        </button>
      </div>

      <div className="mt-4">
        <label htmlFor="busca-cliente" className="text-ebano-800 block text-sm font-medium">
          Buscar por nome, telefone, CPF ou código
        </label>
        <input
          id="busca-cliente"
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="border-ebano-300 focus-visible:outline-carvalho-600 mt-1 block min-h-11 w-full rounded-lg border bg-white px-3 focus-visible:outline-2 sm:max-w-md"
        />
      </div>

      {consulta.isPending && <p className="text-texto-suave mt-8">Carregando clientes…</p>}
      {consulta.isError && (
        <div role="alert" className="mt-8 text-red-700">
          <p>Não foi possível carregar os clientes.</p>
          <button
            type="button"
            onClick={() => void consulta.refetch()}
            className={`${classeBotao} mt-3`}
          >
            Tentar de novo
          </button>
        </div>
      )}
      {consulta.isSuccess && clientes.length === 0 && (
        <p className="text-texto-suave mt-8">
          Nenhum cliente ainda. Converta um lead fechado ou use &quot;Novo cliente&quot;.
        </p>
      )}
      {consulta.isSuccess && clientes.length > 0 && visiveis.length === 0 && (
        <p className="text-texto-suave mt-8">Nenhum cliente encontrado para esta busca.</p>
      )}

      <ul className="mt-6 space-y-3">
        {visiveis.map((cliente) => {
          const whatsapp = linkDoCliente(cliente);
          return (
            <li
              key={cliente.id}
              className="border-ebano-200 flex flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-2">
                  <span className="font-medium">{cliente.nome}</span>
                  <span className="bg-ebano-100 rounded-full px-2 py-0.5 text-xs">
                    {cliente.codigo}
                  </span>
                </p>
                <p className="text-texto-suave mt-1 text-sm">
                  {formatarTelefoneBR(cliente.telefone)}
                  {cliente.cpf && ` · CPF ${formatarCpf(cliente.cpf)}`}
                </p>
                {totais.data?.get(cliente.id) && (
                  <p className="mt-1 text-sm">
                    Contratado {formatarBRL(totais.data.get(cliente.id)!.contratado)} · Pago{' '}
                    {formatarBRL(totais.data.get(cliente.id)!.pago)}
                  </p>
                )}
                {cliente.endereco && (
                  <p className="text-texto-suave text-sm break-words">{cliente.endereco}</p>
                )}
                {cliente.obs && (
                  <p className="mt-1 text-sm break-words whitespace-pre-line">{cliente.obs}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {whatsapp && (
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`WhatsApp: ${cliente.nome}`}
                    className={classeBotao}
                  >
                    WhatsApp
                  </a>
                )}
                <button
                  type="button"
                  className={classeBotao}
                  aria-label={`Editar: ${cliente.nome}`}
                  onClick={() => setFormulario({ cliente })}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className={classeBotao}
                  aria-label={`Excluir: ${cliente.nome}`}
                  onClick={() => {
                    excluir.reset();
                    setExcluindo(cliente);
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
        titulo={formulario?.cliente ? 'Editar cliente' : 'Novo cliente'}
        aoFechar={() => setFormulario(null)}
      >
        {formulario && (
          <FormularioCliente
            cliente={formulario.cliente}
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
        titulo="Excluir cliente?"
        aoFechar={() => setExcluindo(null)}
      >
        {excluindo && (
          <div className="space-y-4">
            <p>
              &quot;{excluindo.nome}&quot; ({excluindo.codigo}) será removido. Isso não pode ser
              desfeito, e o código não será reaproveitado.
            </p>
            {excluir.isError && (
              <p role="alert" className="text-sm text-red-700">
                {mensagemDoCliente(excluir.error)}
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
