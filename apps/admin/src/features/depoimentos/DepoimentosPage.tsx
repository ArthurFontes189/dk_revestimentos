import { depoimentoSchema, moverNaLista, proximaOrdem } from '@dk/core';
import { validarImagem } from '@dk/media';
import { aplicarTarjas } from '@dk/media/navegador';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { Campo, classeBotaoPrimario } from '../../components/Campo';
import { Dialogo } from '../../components/Dialogo';
import { enviarImagem, urlDaVariante } from '../midia/enviar';
import { mensagemDeErro } from '../portfolio/FormularioItem';
import {
  aplicarOrdemDepoimentos,
  atualizarDepoimento,
  criarDepoimento,
  excluirDepoimento,
  listarDepoimentos,
} from './api';
import { EditorTarja } from './EditorTarja';
import type { Depoimento } from './tipos';

const classeBotao =
  'border-ebano-300 text-ebano-800 hover:bg-ebano-100 focus-visible:outline-carvalho-600 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50';

export function DepoimentosPage() {
  const clienteQuery = useQueryClient();
  const consulta = useQuery({ queryKey: ['depoimentos'], queryFn: listarDepoimentos });
  const itens = consulta.data ?? [];
  const recarregar = () => clienteQuery.invalidateQueries({ queryKey: ['depoimentos'] });

  const entradaRef = useRef<HTMLInputElement>(null);
  const [fila, setFila] = useState<File[]>([]);
  const [totalDaFila, setTotalDaFila] = useState(0);
  const [adicionados, setAdicionados] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState<Depoimento | null>(null);
  const [excluindo, setExcluindo] = useState<Depoimento | null>(null);

  const aoFalhar = (falha: unknown) => setErro(mensagemDeErro(falha));

  const mover = useMutation({
    mutationFn: ({ id, direcao }: { id: string; direcao: -1 | 1 }) =>
      aplicarOrdemDepoimentos(moverNaLista(itens, id, direcao)),
    onSuccess: recarregar,
    onError: aoFalhar,
  });
  const alternarVisivel = useMutation({
    mutationFn: (d: Depoimento) => atualizarDepoimento(d.id, { visivel: !d.visivel }),
    onSuccess: recarregar,
    onError: aoFalhar,
  });
  const excluir = useMutation({
    mutationFn: excluirDepoimento,
    onSuccess: () => {
      setExcluindo(null);
      return recarregar();
    },
    onError: aoFalhar,
  });

  function escolherArquivos(arquivos: FileList | null) {
    setErro(null);
    if (!arquivos || arquivos.length === 0) return;
    const validos: File[] = [];
    const problemas: string[] = [];
    for (const arquivo of arquivos) {
      const problema = validarImagem(arquivo);
      if (problema) problemas.push(`${arquivo.name}: ${problema}`);
      else validos.push(arquivo);
    }
    if (problemas.length > 0) setErro(problemas.join(' '));
    setFila(validos);
    setTotalDaFila(validos.length);
    setAdicionados(0);
  }

  async function enviarAtual(tarjas: Parameters<typeof aplicarTarjas>[1]) {
    const atual = fila[0];
    if (!atual) return;
    setEnviando(true);
    setErro(null);
    try {
      const comTarja = await aplicarTarjas(atual, tarjas);
      const midia = await enviarImagem('depoimentos', 'prints', comTarja);
      await criarDepoimento(midia, proximaOrdem(itens) + adicionados);
      setAdicionados((n) => n + 1);
      setFila((restantes) => restantes.slice(1));
      await recarregar();
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setEnviando(false);
    }
  }

  const atual = fila[0];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-(family-name:--font-display) text-3xl">Depoimentos</h1>
          <p className="text-texto-suave mt-1">
            {consulta.isSuccess
              ? `${itens.length} ${itens.length === 1 ? 'imagem' : 'imagens'}`
              : ' '}
          </p>
        </div>
        <button
          type="button"
          onClick={() => entradaRef.current?.click()}
          className="bg-carvalho-600 text-creme hover:bg-carvalho-700 inline-flex min-h-11 items-center rounded-lg px-6 font-medium"
        >
          Adicionar imagens
        </button>
        <input
          ref={entradaRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label="Escolher imagens de depoimentos"
          onChange={(e) => {
            escolherArquivos(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      <p className="text-texto-suave mt-3 text-sm">
        Envie prints de conversas de WhatsApp com elogios. Antes de enviar, cubra telefones e dados
        pessoais com a tarja, e confirme que a pessoa autorizou o uso. As mudanças aparecem no site
        na próxima publicação automática (em até 30 minutos).
      </p>

      {erro && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {erro}
        </p>
      )}
      {consulta.isPending && <p className="text-texto-suave mt-8">Carregando depoimentos…</p>}
      {consulta.isError && (
        <p role="alert" className="mt-8 text-red-700">
          Não foi possível carregar os depoimentos.
        </p>
      )}
      {consulta.isSuccess && itens.length === 0 && (
        <p className="text-texto-suave mt-8">
          Nenhum depoimento ainda. A seção só aparece no site quando houver pelo menos um visível.
        </p>
      )}

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {itens.map((d, indice) => (
          <li
            key={d.id}
            className="border-ebano-200 flex flex-col gap-3 rounded-xl border bg-white p-3"
          >
            <img
              src={urlDaVariante('depoimentos', d.imagem_base, Math.min(...d.larguras))}
              alt={`Depoimento${d.nome ? ` de ${d.nome}` : ''}`}
              width={d.largura_original}
              height={d.altura_original}
              loading="lazy"
              className="bg-ebano-100 max-h-72 w-full rounded-lg object-contain"
            />
            <div className="min-h-10 text-sm">
              <p className="font-medium">{d.nome ?? 'Sem nome'}</p>
              {d.legenda && <p className="text-texto-suave">{d.legenda}</p>}
              {!d.visivel && (
                <p className="mt-1 inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-900">
                  Oculto no site
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={classeBotao}
                aria-label={`Subir depoimento ${indice + 1}`}
                disabled={indice === 0 || mover.isPending}
                onClick={() => mover.mutate({ id: d.id, direcao: -1 })}
              >
                ↑
              </button>
              <button
                type="button"
                className={classeBotao}
                aria-label={`Descer depoimento ${indice + 1}`}
                disabled={indice === itens.length - 1 || mover.isPending}
                onClick={() => mover.mutate({ id: d.id, direcao: 1 })}
              >
                ↓
              </button>
              <button
                type="button"
                className={classeBotao}
                aria-label={`${d.visivel ? 'Ocultar' : 'Exibir'} depoimento ${indice + 1}`}
                onClick={() => alternarVisivel.mutate(d)}
              >
                {d.visivel ? 'Ocultar' : 'Exibir'}
              </button>
              <button
                type="button"
                className={classeBotao}
                aria-label={`Editar depoimento ${indice + 1}`}
                onClick={() => setEditando(d)}
              >
                Editar
              </button>
              <button
                type="button"
                className={classeBotao}
                aria-label={`Excluir depoimento ${indice + 1}`}
                onClick={() => setExcluindo(d)}
              >
                Excluir
              </button>
            </div>
          </li>
        ))}
      </ul>

      <Dialogo
        aberto={atual !== undefined}
        titulo={`Depoimento ${Math.min(adicionados + 1, totalDaFila)} de ${totalDaFila}`}
        aoFechar={() => {
          if (!enviando) setFila([]);
        }}
      >
        {atual && (
          <EditorTarja
            key={`${atual.name}-${atual.size}-${adicionados}`}
            arquivo={atual}
            ocupado={enviando}
            aoEnviar={(tarjas) => void enviarAtual(tarjas)}
            aoPular={() => setFila((restantes) => restantes.slice(1))}
          />
        )}
      </Dialogo>

      <Dialogo
        aberto={editando !== null}
        titulo="Editar depoimento"
        aoFechar={() => setEditando(null)}
      >
        {editando && (
          <FormularioDepoimento
            depoimento={editando}
            aoConcluir={() => {
              setEditando(null);
              void recarregar();
            }}
          />
        )}
      </Dialogo>

      <Dialogo
        aberto={excluindo !== null}
        titulo="Excluir depoimento?"
        aoFechar={() => setExcluindo(null)}
      >
        {excluindo && (
          <div className="space-y-4">
            <p>A imagem será removida do site e o arquivo apagado. Isso não pode ser desfeito.</p>
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

function FormularioDepoimento({
  depoimento,
  aoConcluir,
}: {
  depoimento: Depoimento;
  aoConcluir: () => void;
}) {
  const [nome, setNome] = useState(depoimento.nome ?? '');
  const [legenda, setLegenda] = useState(depoimento.legenda ?? '');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    const dados = depoimentoSchema.safeParse({ nome, legenda });
    if (!dados.success) {
      setErro(dados.error.issues[0]?.message ?? 'Confira os campos.');
      return;
    }
    setSalvando(true);
    try {
      await atualizarDepoimento(depoimento.id, {
        nome: dados.data.nome ?? null,
        legenda: dados.data.legenda ?? null,
      });
      aoConcluir();
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={(e) => void salvar(e)} className="space-y-4" noValidate>
      <Campo
        rotulo="Primeiro nome (opcional)"
        name="nome"
        value={nome}
        maxLength={60}
        onChange={(e) => setNome(e.target.value)}
      />
      <Campo
        rotulo="Projeto ou cidade (opcional)"
        name="legenda"
        value={legenda}
        maxLength={120}
        onChange={(e) => setLegenda(e.target.value)}
      />
      {erro && (
        <p role="alert" className="text-sm text-red-700">
          {erro}
        </p>
      )}
      <button type="submit" className={classeBotaoPrimario} disabled={salvando}>
        {salvando ? 'Salvando…' : 'Salvar'}
      </button>
    </form>
  );
}
