import {
  CATEGORIA_ENTRADA_MANUAL,
  CATEGORIAS_SAIDA_MANUAL,
  lancamentoSchema,
  TIPOS_TRANSACAO,
  type TipoTransacao,
} from '@dk/core';
import { useState, type FormEvent } from 'react';
import { Campo, classeBotaoPrimario } from '../../components/Campo';
import { atualizarLancamento, criarLancamento, mensagemDoCaixa } from './api';
import type { LancamentoDoCaixa } from './tipos';

interface Props {
  /** Lançamento manual sendo editado; `null` cria um novo. */
  lancamento: LancamentoDoCaixa | null;
  aoConcluir: () => void;
  aoCancelar: () => void;
}

const classeBotaoSecundario =
  'border-ebano-300 text-ebano-800 hover:bg-ebano-100 focus-visible:outline-carvalho-600 inline-flex min-h-11 w-full items-center justify-center rounded-lg border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2';
const classeSelect =
  'border-ebano-300 focus-visible:outline-carvalho-600 mt-1 block min-h-11 w-full rounded-lg border bg-white px-3 focus-visible:outline-2';

const ROTULO_TIPO: Record<TipoTransacao, string> = { entrada: 'Entrada', saida: 'Saída' };

/** Data de hoje no calendário local; `toISOString` trocaria o dia perto da meia-noite. */
function hojeIso(): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

const categoriasDoTipo = (tipo: TipoTransacao): readonly string[] =>
  tipo === 'entrada' ? [CATEGORIA_ENTRADA_MANUAL] : CATEGORIAS_SAIDA_MANUAL;

export function FormularioLancamento({ lancamento, aoConcluir, aoCancelar }: Props) {
  const [tipo, setTipo] = useState<TipoTransacao>(lancamento?.tipo ?? 'saida');
  const [categoria, setCategoria] = useState(lancamento?.categoria ?? CATEGORIAS_SAIDA_MANUAL[0]);
  const [descricao, setDescricao] = useState(lancamento?.descricao ?? '');
  const [valor, setValor] = useState(
    lancamento ? lancamento.valor.toFixed(2).replace('.', ',') : '',
  );
  const [data, setData] = useState(lancamento?.data ?? hojeIso());
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  function mudarTipo(novo: TipoTransacao) {
    setTipo(novo);
    setCategoria(categoriasDoTipo(novo)[0] ?? '');
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);

    const dados = lancamentoSchema.safeParse({ tipo, categoria, descricao, valor, data });
    if (!dados.success) {
      setErro(dados.error.issues[0]?.message ?? 'Confira os campos.');
      return;
    }

    setSalvando(true);
    try {
      if (lancamento) await atualizarLancamento(lancamento.id, dados.data);
      else await criarLancamento(dados.data);
      aoConcluir();
    } catch (falha) {
      setErro(mensagemDoCaixa(falha));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={(e) => void salvar(e)} className="space-y-4" noValidate>
      <div>
        <label htmlFor="tipo-lancamento" className="text-ebano-800 block text-sm font-medium">
          Tipo
        </label>
        <select
          id="tipo-lancamento"
          value={tipo}
          onChange={(e) => mudarTipo(e.target.value as TipoTransacao)}
          className={classeSelect}
        >
          {TIPOS_TRANSACAO.map((t) => (
            <option key={t} value={t}>
              {ROTULO_TIPO[t]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="categoria-lancamento" className="text-ebano-800 block text-sm font-medium">
          Categoria
        </label>
        <select
          id="categoria-lancamento"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className={classeSelect}
        >
          {categoriasDoTipo(tipo).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {tipo === 'entrada' && (
          <p className="text-texto-suave mt-1 text-xs">
            Dinheiro de cliente entra pela obra (&quot;Quitar saldo&quot; ou entrada inicial).
          </p>
        )}
      </div>
      <Campo
        rotulo="Descrição (opcional)"
        name="descricao"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        autoComplete="off"
      />
      <Campo
        rotulo="Valor (R$)"
        name="valor"
        inputMode="decimal"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        autoComplete="off"
        required
      />
      <Campo
        rotulo="Data"
        name="data"
        type="date"
        value={data}
        onChange={(e) => setData(e.target.value)}
        required
      />

      {erro && (
        <p role="alert" className="text-sm text-red-700">
          {erro}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <button type="submit" disabled={salvando} className={classeBotaoPrimario}>
          {salvando ? 'Salvando…' : lancamento ? 'Salvar alterações' : 'Lançar no caixa'}
        </button>
        <button
          type="button"
          disabled={salvando}
          onClick={aoCancelar}
          className={classeBotaoSecundario}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
