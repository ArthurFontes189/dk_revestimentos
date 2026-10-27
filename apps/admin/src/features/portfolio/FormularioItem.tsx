import { CATEGORIAS_PORTFOLIO, itemPortfolioSchema, type CategoriaPortfolio } from '@dk/core';
import { validarImagem, validarVideo } from '@dk/media';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Campo, classeBotaoPrimario } from '../../components/Campo';
import { enviarImagem, enviarVideo } from '../midia/enviar';
import { atualizarItem, criarItem } from './api';
import type { ItemPortfolio } from './tipos';

interface Props {
  /** Item sendo editado; `null` cria um novo (com envio de mídia). */
  item: ItemPortfolio | null;
  proximaOrdem: number;
  aoConcluir: () => void;
  aoCancelar: () => void;
}

export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof Error) return erro.message;
  if (typeof erro === 'object' && erro !== null && 'message' in erro) {
    return String((erro as { message: unknown }).message);
  }
  return 'Não foi possível concluir. Tente de novo.';
}

const classeSelect =
  'border-ebano-300 focus-visible:outline-carvalho-600 mt-1 block min-h-11 w-full rounded-lg border bg-white px-3 focus-visible:outline-2';

export function FormularioItem({ item, proximaOrdem, aoConcluir, aoCancelar }: Props) {
  const editando = item !== null;
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [titulo, setTitulo] = useState(item?.titulo ?? '');
  const [descricao, setDescricao] = useState(item?.descricao ?? '');
  const [categoria, setCategoria] = useState<CategoriaPortfolio>(item?.categoria ?? 'MARCENARIA');
  const [erro, setErro] = useState<string | null>(null);
  const [etapa, setEtapa] = useState<string | null>(null);

  const previa = useMemo(
    () => (arquivo?.type.startsWith('image/') ? URL.createObjectURL(arquivo) : null),
    [arquivo],
  );
  useEffect(
    () => () => {
      if (previa) URL.revokeObjectURL(previa);
    },
    [previa],
  );

  const enviando = etapa !== null;

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);

    const dados = itemPortfolioSchema.safeParse({ titulo, descricao, categoria });
    if (!dados.success) {
      setErro(dados.error.issues[0]?.message ?? 'Confira os campos.');
      return;
    }

    try {
      if (item) {
        setEtapa('Salvando…');
        await atualizarItem(item.id, dados.data);
      } else {
        if (!arquivo) {
          setErro('Escolha uma foto ou um vídeo.');
          return;
        }
        const ehVideo = arquivo.type.startsWith('video/');
        const problema = ehVideo ? validarVideo(arquivo) : validarImagem(arquivo);
        if (problema) {
          setErro(problema);
          return;
        }
        setEtapa(ehVideo ? 'Preparando o vídeo e a capa…' : 'Otimizando a imagem…');
        const midia = ehVideo
          ? await enviarVideo('itens', arquivo)
          : await enviarImagem('portfolio', 'itens', arquivo, (feitos, total) =>
              setEtapa(`Enviando ${feitos} de ${total}…`),
            );
        setEtapa('Salvando…');
        await criarItem({
          ...dados.data,
          tipo: ehVideo ? 'video' : 'foto',
          midia,
          ordem: proximaOrdem,
        });
      }
      aoConcluir();
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setEtapa(null);
    }
  }

  return (
    <form onSubmit={(e) => void salvar(e)} className="space-y-4" noValidate>
      {!editando && (
        <div>
          <label htmlFor="arquivo-item" className="text-ebano-800 block text-sm font-medium">
            Foto ou vídeo
          </label>
          <input
            id="arquivo-item"
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4"
            disabled={enviando}
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm"
          />
          <p className="text-texto-suave mt-1 text-xs">
            Fotos: JPEG, PNG ou WebP, até 15 MB. Vídeos: MP4, até 25 MB (a capa é gerada
            automaticamente).
          </p>
          {previa && (
            <img
              src={previa}
              alt="Prévia da imagem escolhida"
              className="mt-3 max-h-48 rounded-lg"
            />
          )}
          {arquivo && !previa && (
            <p className="text-texto-suave mt-2 text-sm">Vídeo escolhido: {arquivo.name}</p>
          )}
        </div>
      )}

      <Campo
        rotulo="Título"
        name="titulo"
        value={titulo}
        maxLength={120}
        disabled={enviando}
        onChange={(e) => setTitulo(e.target.value)}
        required
      />

      <div>
        <label htmlFor="descricao-item" className="text-ebano-800 block text-sm font-medium">
          Descrição (também é o texto alternativo da imagem)
        </label>
        <textarea
          id="descricao-item"
          rows={3}
          maxLength={600}
          value={descricao}
          disabled={enviando}
          onChange={(e) => setDescricao(e.target.value)}
          className={`${classeSelect} py-2`}
        />
      </div>

      <div>
        <label htmlFor="categoria-item" className="text-ebano-800 block text-sm font-medium">
          Categoria
        </label>
        <select
          id="categoria-item"
          value={categoria}
          disabled={enviando}
          onChange={(e) => setCategoria(e.target.value as CategoriaPortfolio)}
          className={classeSelect}
        >
          {CATEGORIAS_PORTFOLIO.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {erro && (
        <p role="alert" className="text-sm text-red-700">
          {erro}
        </p>
      )}
      {etapa && (
        <p role="status" className="text-texto-suave text-sm">
          {etapa}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <button type="submit" className={classeBotaoPrimario} disabled={enviando}>
          {editando ? 'Salvar alterações' : 'Adicionar ao portfólio'}
        </button>
        <button
          type="button"
          onClick={aoCancelar}
          disabled={enviando}
          className="border-ebano-300 hover:bg-ebano-100 inline-flex min-h-11 w-full items-center justify-center rounded-lg border px-6 font-medium disabled:opacity-60"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
