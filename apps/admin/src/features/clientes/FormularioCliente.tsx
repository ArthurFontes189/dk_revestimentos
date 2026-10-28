import { clienteSchema, formatarCpf, formatarTelefoneBR } from '@dk/core';
import { useState, type FormEvent } from 'react';
import { Campo, classeBotaoPrimario } from '../../components/Campo';
import { atualizarCliente, criarCliente, mensagemDoCliente } from './api';
import type { Cliente } from './tipos';

interface Props {
  /** Cliente sendo editado; `null` cria um novo. */
  cliente: Cliente | null;
  aoConcluir: () => void;
  aoCancelar: () => void;
}

const classeBotaoSecundario =
  'border-ebano-300 text-ebano-800 hover:bg-ebano-100 focus-visible:outline-carvalho-600 inline-flex min-h-11 w-full items-center justify-center rounded-lg border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2';

export function FormularioCliente({ cliente, aoConcluir, aoCancelar }: Props) {
  const [nome, setNome] = useState(cliente?.nome ?? '');
  const [telefone, setTelefone] = useState(cliente ? formatarTelefoneBR(cliente.telefone) : '');
  const [cpf, setCpf] = useState(cliente?.cpf ? formatarCpf(cliente.cpf) : '');
  const [endereco, setEndereco] = useState(cliente?.endereco ?? '');
  const [obs, setObs] = useState(cliente?.obs ?? '');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);

    const dados = clienteSchema.safeParse({ nome, telefone, cpf, endereco, obs });
    if (!dados.success) {
      setErro(dados.error.issues[0]?.message ?? 'Confira os campos.');
      return;
    }

    setSalvando(true);
    try {
      if (cliente) await atualizarCliente(cliente.id, dados.data);
      else await criarCliente(dados.data);
      aoConcluir();
    } catch (falha) {
      setErro(mensagemDoCliente(falha));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={(e) => void salvar(e)} className="space-y-4" noValidate>
      <Campo
        rotulo="Nome"
        name="nome"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        autoComplete="off"
        required
      />
      <Campo
        rotulo="Telefone (WhatsApp)"
        name="telefone"
        type="tel"
        inputMode="tel"
        value={telefone}
        onChange={(e) => setTelefone(e.target.value)}
        autoComplete="off"
        required
      />
      <Campo
        rotulo="CPF (opcional)"
        name="cpf"
        inputMode="numeric"
        value={cpf}
        onChange={(e) => setCpf(e.target.value)}
        autoComplete="off"
      />
      <Campo
        rotulo="Endereço (opcional)"
        name="endereco"
        value={endereco}
        onChange={(e) => setEndereco(e.target.value)}
        autoComplete="off"
      />
      <div>
        <label htmlFor="obs-cliente" className="text-ebano-800 block text-sm font-medium">
          Observações (opcional)
        </label>
        <textarea
          id="obs-cliente"
          rows={3}
          value={obs}
          onChange={(e) => setObs(e.target.value)}
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
          {salvando ? 'Salvando…' : cliente ? 'Salvar alterações' : 'Cadastrar cliente'}
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
