import { obraDaConversaoSchema, STATUS_OBRA, type DadosObraDaConversao } from '@dk/core';
import { useState, type FormEvent } from 'react';
import { Campo, classeBotaoPrimario } from '../../components/Campo';

interface Props {
  /** Descrição sugerida a partir do serviço pedido no lead. */
  descricaoInicial: string;
  salvando: boolean;
  aoConfirmar: (obra: DadosObraDaConversao) => void;
  aoCancelar: () => void;
}

const classeBotaoSecundario =
  'border-ebano-300 text-ebano-800 hover:bg-ebano-100 focus-visible:outline-carvalho-600 inline-flex min-h-11 w-full items-center justify-center rounded-lg border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2';

/** Dados da ficha de obra criada junto com a conversão do lead; o envio é do componente pai. */
export function FormularioConversaoObra({
  descricaoInicial,
  salvando,
  aoConfirmar,
  aoCancelar,
}: Props) {
  const [descricao, setDescricao] = useState(descricaoInicial);
  const [valorTotal, setValorTotal] = useState('');
  const [valorEntrada, setValorEntrada] = useState('');
  const [status, setStatus] = useState<string>(STATUS_OBRA[0]);
  const [dataEntrega, setDataEntrega] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('');
  const [materiais, setMateriais] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  function confirmar(evento: FormEvent) {
    evento.preventDefault();
    const dados = obraDaConversaoSchema.safeParse({
      descricao,
      valor_total: valorTotal,
      valor_entrada: valorEntrada,
      status,
      data_entrega: dataEntrega,
      responsavel,
      forma_pagamento: formaPagamento,
      materiais,
    });
    if (!dados.success) {
      setErro(dados.error.issues[0]?.message ?? 'Confira os campos.');
      return;
    }
    setErro(null);
    aoConfirmar(dados.data);
  }

  return (
    <form onSubmit={confirmar} className="space-y-4" noValidate>
      <Campo
        rotulo="Descrição da obra"
        name="descricao"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        autoComplete="off"
        required
      />
      <Campo
        rotulo="Valor total (R$)"
        name="valor_total"
        inputMode="decimal"
        value={valorTotal}
        onChange={(e) => setValorTotal(e.target.value)}
        autoComplete="off"
        required
      />
      <Campo
        rotulo="Entrada inicial (R$, opcional)"
        name="valor_entrada"
        inputMode="decimal"
        value={valorEntrada}
        onChange={(e) => setValorEntrada(e.target.value)}
        autoComplete="off"
      />
      <div>
        <label htmlFor="status-nova-obra" className="text-ebano-800 block text-sm font-medium">
          Status
        </label>
        <select
          id="status-nova-obra"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border-ebano-300 focus-visible:outline-carvalho-600 mt-1 block min-h-11 w-full rounded-lg border bg-white px-3 focus-visible:outline-2"
        >
          {STATUS_OBRA.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <Campo
        rotulo="Data de entrega (opcional)"
        name="data_entrega"
        type="date"
        value={dataEntrega}
        onChange={(e) => setDataEntrega(e.target.value)}
      />
      <Campo
        rotulo="Responsável (opcional)"
        name="responsavel"
        value={responsavel}
        onChange={(e) => setResponsavel(e.target.value)}
        autoComplete="off"
      />
      <Campo
        rotulo="Forma de pagamento (opcional)"
        name="forma_pagamento"
        value={formaPagamento}
        onChange={(e) => setFormaPagamento(e.target.value)}
        autoComplete="off"
      />
      <div>
        <label htmlFor="materiais-nova-obra" className="text-ebano-800 block text-sm font-medium">
          Materiais (opcional)
        </label>
        <textarea
          id="materiais-nova-obra"
          rows={3}
          value={materiais}
          onChange={(e) => setMateriais(e.target.value)}
          className="border-ebano-300 focus-visible:outline-carvalho-600 mt-1 block w-full rounded-lg border bg-white px-3 py-2 focus-visible:outline-2"
        />
      </div>

      {erro && (
        <p role="alert" className="text-sm text-red-700">
          {erro}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <button type="submit" disabled={salvando} className={classeBotaoPrimario}>
          {salvando ? 'Convertendo…' : 'Converter e criar obra'}
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
