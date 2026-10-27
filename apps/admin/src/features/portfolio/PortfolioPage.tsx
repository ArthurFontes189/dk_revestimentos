import { moverNaLista, proximaOrdem } from '@dk/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Dialogo } from '../../components/Dialogo';
import { urlDaVariante } from '../midia/enviar';
import { aplicarOrdem, atualizarItem, excluirItem, listarPortfolio } from './api';
import { FormularioItem, mensagemDeErro } from './FormularioItem';
import type { ItemPortfolio } from './tipos';

const classeBotao =
  'border-ebano-300 text-ebano-800 hover:bg-ebano-100 focus-visible:outline-carvalho-600 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50';

export function PortfolioPage() {
  const clienteQuery = useQueryClient();
  const consulta = useQuery({ queryKey: ['portfolio'], queryFn: listarPortfolio });
  const [formulario, setFormulario] = useState<{ item: ItemPortfolio | null } | null>(null);
  const [excluindo, setExcluindo] = useState<ItemPortfolio | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const itens = consulta.data ?? [];
  const recarregar = () => clienteQuery.invalidateQueries({ queryKey: ['portfolio'] });
  const aoFalhar = (falha: unknown) => setErro(mensagemDeErro(falha));

  const mover = useMutation({
    mutationFn: ({ id, direcao }: { id: string; direcao: -1 | 1 }) =>
      aplicarOrdem(moverNaLista(itens, id, direcao)),
    onSuccess: recarregar,
    onError: aoFalhar,
  });
  const alternar = useMutation({
    mutationFn: ({
      id,
      campo,
      valor,
    }: {
      id: string;
      campo: 'publicado' | 'destaque';
      valor: boolean;
    }) => atualizarItem(id, { [campo]: valor }),
    onSuccess: recarregar,
    onError: aoFalhar,
  });
  const excluir = useMutation({
    mutationFn: excluirItem,
    onSuccess: () => {
      setExcluindo(null);
      return recarregar();
    },
    onError: aoFalhar,
  });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-(family-name:--font-display) text-3xl">Portfólio</h1>
          <p className="text-texto-suave mt-1">
            {consulta.isSuccess ? `${itens.length} ${itens.length === 1 ? 'item' : 'itens'}` : ' '}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormulario({ item: null })}
          className="bg-carvalho-600 text-creme hover:bg-carvalho-700 inline-flex min-h-11 items-center rounded-lg px-6 font-medium"
        >
          Novo item
        </button>
      </div>

      <p className="text-texto-suave mt-3 text-sm">
        As mudanças aparecem no site público na próxima publicação automática (em até 30 minutos).
      </p>

      {erro && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {erro}
        </p>
      )}
      {consulta.isPending && <p className="text-texto-suave mt-8">Carregando portfólio…</p>}
      {consulta.isError && (
        <p role="alert" className="mt-8 text-red-700">
          Não foi possível carregar o portfólio.
        </p>
      )}
      {consulta.isSuccess && itens.length === 0 && (
        <p className="text-texto-suave mt-8">
          Nenhum item ainda. Use &quot;Novo item&quot; para enviar a primeira foto ou vídeo.
        </p>
      )}

      <ul className="mt-6 space-y-3">
        {itens.map((item, indice) => (
          <li
            key={item.id}
            className="border-ebano-200 flex flex-col gap-4 rounded-xl border bg-white p-3 sm:flex-row sm:items-center"
          >
            <img
              src={urlDaVariante('portfolio', item.imagem_base, Math.min(...item.larguras))}
              alt=""
              width={item.largura_original}
              height={item.altura_original}
              loading="lazy"
              className="bg-ebano-100 h-28 w-full rounded-lg object-cover sm:w-40"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{item.titulo}</p>
              <p className="text-texto-suave text-sm">{item.categoria}</p>
              <p className="mt-1 flex flex-wrap gap-2 text-xs">
                {item.tipo === 'video' && (
                  <span className="bg-ebano-100 rounded-full px-2 py-0.5">Vídeo</span>
                )}
                {item.destaque && (
                  <span className="bg-ouro-100 rounded-full px-2 py-0.5">Destaque</span>
                )}
                {!item.publicado && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-900">
                    Oculto no site
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={classeBotao}
                aria-label={`Subir: ${item.titulo}`}
                disabled={indice === 0 || mover.isPending}
                onClick={() => mover.mutate({ id: item.id, direcao: -1 })}
              >
                ↑
              </button>
              <button
                type="button"
                className={classeBotao}
                aria-label={`Descer: ${item.titulo}`}
                disabled={indice === itens.length - 1 || mover.isPending}
                onClick={() => mover.mutate({ id: item.id, direcao: 1 })}
              >
                ↓
              </button>
              <button
                type="button"
                className={classeBotao}
                aria-pressed={item.publicado}
                aria-label={`${item.publicado ? 'Ocultar' : 'Publicar'}: ${item.titulo}`}
                onClick={() =>
                  alternar.mutate({ id: item.id, campo: 'publicado', valor: !item.publicado })
                }
              >
                {item.publicado ? 'Ocultar' : 'Publicar'}
              </button>
              <button
                type="button"
                className={classeBotao}
                aria-pressed={item.destaque}
                aria-label={`${item.destaque ? 'Remover destaque' : 'Destacar'}: ${item.titulo}`}
                onClick={() =>
                  alternar.mutate({ id: item.id, campo: 'destaque', valor: !item.destaque })
                }
              >
                {item.destaque ? '★' : '☆'}
              </button>
              <button
                type="button"
                className={classeBotao}
                aria-label={`Editar: ${item.titulo}`}
                onClick={() => setFormulario({ item })}
              >
                Editar
              </button>
              <button
                type="button"
                className={classeBotao}
                aria-label={`Excluir: ${item.titulo}`}
                onClick={() => setExcluindo(item)}
              >
                Excluir
              </button>
            </div>
          </li>
        ))}
      </ul>

      <Dialogo
        aberto={formulario !== null}
        titulo={formulario?.item ? 'Editar item' : 'Novo item do portfólio'}
        aoFechar={() => setFormulario(null)}
      >
        {formulario && (
          <FormularioItem
            item={formulario.item}
            proximaOrdem={proximaOrdem(itens)}
            aoCancelar={() => setFormulario(null)}
            aoConcluir={() => {
              setFormulario(null);
              setErro(null);
              void recarregar();
            }}
          />
        )}
      </Dialogo>

      <Dialogo
        aberto={excluindo !== null}
        titulo="Excluir item?"
        aoFechar={() => setExcluindo(null)}
      >
        {excluindo && (
          <div className="space-y-4">
            <p>
              &quot;{excluindo.titulo}&quot; será removido do portfólio, e os arquivos de imagem e
              vídeo também serão apagados. Isso não pode ser desfeito.
            </p>
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
