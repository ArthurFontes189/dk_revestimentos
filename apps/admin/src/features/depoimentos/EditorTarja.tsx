import { retanguloDoArrasto, type Retangulo } from '@dk/media';
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';

interface Ponto {
  x: number;
  y: number;
}

interface Arrasto {
  inicio: Ponto;
  fim: Ponto;
  area: { largura: number; altura: number };
}

interface Props {
  arquivo: File;
  ocupado: boolean;
  aoEnviar: (tarjas: Retangulo[]) => void;
  aoPular: () => void;
}

const classeBotao =
  'border-ebano-300 text-ebano-800 hover:bg-ebano-100 focus-visible:outline-carvalho-600 inline-flex min-h-11 items-center justify-center rounded-lg border px-4 text-sm font-medium focus-visible:outline-2 disabled:opacity-50';

function estiloDaTarja(t: Retangulo) {
  return {
    left: `${t.x * 100}%`,
    top: `${t.y * 100}%`,
    width: `${t.largura * 100}%`,
    height: `${t.altura * 100}%`,
  };
}

/**
 * Editor de privacidade: o admin arrasta o dedo/mouse sobre a imagem para cobrir telefones, nomes
 * e outros dados pessoais. As tarjas são pintadas nos pixels antes do envio (ver `aplicarTarjas`).
 */
export function EditorTarja({ arquivo, ocupado, aoEnviar, aoPular }: Props) {
  const previa = useMemo(() => URL.createObjectURL(arquivo), [arquivo]);
  useEffect(() => () => URL.revokeObjectURL(previa), [previa]);

  const areaRef = useRef<HTMLDivElement>(null);
  const [tarjas, setTarjas] = useState<Retangulo[]>([]);
  const [arrasto, setArrasto] = useState<Arrasto | null>(null);

  function pontoDoEvento(evento: PointerEvent<HTMLDivElement>): {
    ponto: Ponto;
    area: Arrasto['area'];
  } {
    const caixa = evento.currentTarget.getBoundingClientRect();
    return {
      ponto: { x: evento.clientX - caixa.left, y: evento.clientY - caixa.top },
      area: { largura: caixa.width, altura: caixa.height },
    };
  }

  function iniciar(evento: PointerEvent<HTMLDivElement>) {
    if (ocupado) return;
    evento.currentTarget.setPointerCapture(evento.pointerId);
    const { ponto, area } = pontoDoEvento(evento);
    setArrasto({ inicio: ponto, fim: ponto, area });
  }

  function mover(evento: PointerEvent<HTMLDivElement>) {
    if (!arrasto) return;
    setArrasto({ ...arrasto, fim: pontoDoEvento(evento).ponto });
  }

  function terminar(evento: PointerEvent<HTMLDivElement>) {
    if (!arrasto) return;
    const novo = retanguloDoArrasto(arrasto.inicio, pontoDoEvento(evento).ponto, arrasto.area);
    setArrasto(null);
    if (novo) setTarjas((atuais) => [...atuais, novo]);
  }

  const rascunho = arrasto ? retanguloDoArrasto(arrasto.inicio, arrasto.fim, arrasto.area) : null;

  return (
    <div className="space-y-4">
      <p className="text-sm">
        <strong>Proteja a privacidade:</strong> arraste sobre a imagem para cobrir telefones,
        sobrenomes e qualquer dado pessoal antes de enviar. A área coberta fica preta no arquivo
        enviado.
      </p>

      <div
        ref={areaRef}
        role="img"
        aria-label="Imagem do depoimento. Arraste para cobrir áreas com uma tarja preta."
        className="relative mx-auto w-fit max-w-full touch-none select-none"
        onPointerDown={iniciar}
        onPointerMove={mover}
        onPointerUp={terminar}
        onPointerCancel={() => setArrasto(null)}
      >
        <img
          src={previa}
          alt=""
          draggable={false}
          className="block max-h-[42dvh] w-auto max-w-full rounded-lg"
        />
        {tarjas.map((t, i) => (
          <div key={i} data-tarja className="absolute bg-black" style={estiloDaTarja(t)} />
        ))}
        {rascunho && (
          <div
            className="outline-ouro-500 absolute bg-black/70 outline-2"
            style={estiloDaTarja(rascunho)}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={classeBotao}
          disabled={tarjas.length === 0 || ocupado}
          onClick={() => setTarjas((atuais) => atuais.slice(0, -1))}
        >
          Desfazer última tarja
        </button>
        <button
          type="button"
          className={classeBotao}
          disabled={tarjas.length === 0 || ocupado}
          onClick={() => setTarjas([])}
        >
          Limpar tarjas
        </button>
        <span className="text-texto-suave text-sm" aria-live="polite">
          {tarjas.length === 0
            ? 'Nenhuma tarja'
            : `${tarjas.length} ${tarjas.length === 1 ? 'tarja' : 'tarjas'}`}
        </span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <button
          type="button"
          disabled={ocupado}
          onClick={() => aoEnviar(tarjas)}
          className="bg-carvalho-600 text-creme hover:bg-carvalho-700 inline-flex min-h-11 w-full items-center justify-center rounded-lg px-6 font-medium disabled:opacity-60"
        >
          {ocupado ? 'Enviando…' : tarjas.length === 0 ? 'Enviar sem tarja' : 'Enviar com tarja'}
        </button>
        <button
          type="button"
          disabled={ocupado}
          onClick={aoPular}
          className={`${classeBotao} w-full`}
        >
          Pular esta imagem
        </button>
      </div>
    </div>
  );
}
