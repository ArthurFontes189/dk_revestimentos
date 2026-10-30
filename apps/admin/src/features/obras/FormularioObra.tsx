import { formatarBRL, novaObraSchema, obraSchema, STATUS_OBRA } from '@dk/core';
import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Campo, classeBotaoPrimario } from '../../components/Campo';
import { atualizarObra, criarObra, listarClientesParaObra, mensagemDaObra } from './api';
import type { Obra } from './tipos';

interface Props {
  /** Obra sendo editada; `null` cria uma nova. */
  obra: Obra | null;
  aoConcluir: () => void;
  aoCancelar: () => void;
}

const classeBotaoSecundario =
  'border-ebano-300 text-ebano-800 hover:bg-ebano-100 focus-visible:outline-carvalho-600 inline-flex min-h-11 w-full items-center justify-center rounded-lg border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2';
const classeSelect =
  'border-ebano-300 focus-visible:outline-carvalho-600 mt-1 block min-h-11 w-full rounded-lg border bg-white px-3 focus-visible:outline-2';

const textoDoValor = (valor: number) => (valor ? valor.toFixed(2).replace('.', ',') : '');

export function FormularioObra({ obra, aoConcluir, aoCancelar }: Props) {
  const clientes = useQuery({ queryKey: ['clientes-para-obra'], queryFn: listarClientesParaObra });
  const [clienteId, setClienteId] = useState(obra ? String(obra.client_id) : '');
  const [descricao, setDescricao] = useState(obra?.descricao ?? '');
  const [materiais, setMateriais] = useState(obra?.materiais ?? '');
  const [formaPagamento, setFormaPagamento] = useState(obra?.forma_pagamento ?? '');
  const [responsavel, setResponsavel] = useState(obra?.responsavel ?? '');
  const [dataEntrega, setDataEntrega] = useState(obra?.data_entrega ?? '');
  const [valorTotal, setValorTotal] = useState(obra ? textoDoValor(obra.valor_total) : '');
  const [valorEntrada, setValorEntrada] = useState('');
  const [status, setStatus] = useState<string>(obra?.status ?? STATUS_OBRA[0]);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);

    const bruto = {
      client_id: Number(clienteId),
      descricao,
      materiais,
      forma_pagamento: formaPagamento,
      responsavel,
      data_entrega: dataEntrega,
      valor_total: valorTotal,
      status,
    };

    setSalvando(true);
    try {
      if (obra) {
        const dados = obraSchema.safeParse(bruto);
        if (!dados.success) {
          setErro(dados.error.issues[0]?.message ?? 'Confira os campos.');
          return;
        }
        await atualizarObra(obra.id, dados.data);
      } else {
        const dados = novaObraSchema.safeParse({ ...bruto, valor_entrada: valorEntrada });
        if (!dados.success) {
          setErro(dados.error.issues[0]?.message ?? 'Confira os campos.');
          return;
        }
        const { valor_entrada: entrada, ...ficha } = dados.data;
        await criarObra(ficha, entrada);
      }
      aoConcluir();
    } catch (falha) {
      setErro(mensagemDaObra(falha));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={(e) => void salvar(e)} className="space-y-4" noValidate>
      <div>
        <label htmlFor="cliente-obra" className="text-ebano-800 block text-sm font-medium">
          Cliente
        </label>
        <select
          id="cliente-obra"
          value={clienteId}
          disabled={obra !== null}
          onChange={(e) => setClienteId(e.target.value)}
          className={classeSelect}
        >
          <option value="">Escolha o cliente</option>
          {(clientes.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome} ({c.codigo})
            </option>
          ))}
        </select>
        {clientes.isError && (
          <p role="alert" className="mt-1 text-sm text-red-700">
            Não foi possível carregar os clientes.
          </p>
        )}
      </div>
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
      {obra ? (
        <p className="text-texto-suave text-sm">
          Recebido até agora: {formatarBRL(obra.valor_recebido)}. Novos recebimentos entram pelo
          botão &quot;Quitar saldo&quot; na lista.
        </p>
      ) : (
        <Campo
          rotulo="Entrada inicial (R$, opcional)"
          name="valor_entrada"
          inputMode="decimal"
          value={valorEntrada}
          onChange={(e) => setValorEntrada(e.target.value)}
          autoComplete="off"
        />
      )}
      <div>
        <label htmlFor="status-obra" className="text-ebano-800 block text-sm font-medium">
          Status
        </label>
        <select
          id="status-obra"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={classeSelect}
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
        <label htmlFor="materiais-obra" className="text-ebano-800 block text-sm font-medium">
          Materiais (opcional)
        </label>
        <textarea
          id="materiais-obra"
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
          {salvando ? 'Salvando…' : obra ? 'Salvar alterações' : 'Criar ficha de obra'}
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
