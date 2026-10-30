import { CARGOS_SUGERIDOS, formatarTelefoneBR, funcionarioSchema } from '@dk/core';
import { useState, type FormEvent } from 'react';
import { Campo, classeBotaoPrimario } from '../../components/Campo';
import { atualizarFuncionario, criarFuncionario, mensagemDaEquipe } from './api';
import type { Funcionario } from './tipos';

interface Props {
  /** Funcionário sendo editado; `null` cria um novo. */
  funcionario: Funcionario | null;
  aoConcluir: () => void;
  aoCancelar: () => void;
}

const classeBotaoSecundario =
  'border-ebano-300 text-ebano-800 hover:bg-ebano-100 focus-visible:outline-carvalho-600 inline-flex min-h-11 w-full items-center justify-center rounded-lg border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2';

export function FormularioFuncionario({ funcionario, aoConcluir, aoCancelar }: Props) {
  const [nome, setNome] = useState(funcionario?.nome ?? '');
  const [cargo, setCargo] = useState(funcionario?.cargo ?? '');
  const [telefone, setTelefone] = useState(
    funcionario?.telefone ? formatarTelefoneBR(funcionario.telefone) : '',
  );
  const [chavePix, setChavePix] = useState(funcionario?.chave_pix ?? '');
  const [diaria, setDiaria] = useState(
    funcionario?.diaria_padrao ? funcionario.diaria_padrao.toFixed(2).replace('.', ',') : '',
  );
  const [ativo, setAtivo] = useState(funcionario?.ativo ?? true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);

    const dados = funcionarioSchema.safeParse({
      nome,
      cargo,
      telefone,
      chave_pix: chavePix,
      diaria_padrao: diaria === '' ? '0' : diaria,
      ativo,
    });
    if (!dados.success) {
      setErro(dados.error.issues[0]?.message ?? 'Confira os campos.');
      return;
    }

    setSalvando(true);
    try {
      if (funcionario) await atualizarFuncionario(funcionario.id, dados.data);
      else await criarFuncionario(dados.data);
      aoConcluir();
    } catch (falha) {
      setErro(mensagemDaEquipe(falha));
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
      <div>
        <Campo
          rotulo="Cargo (opcional)"
          name="cargo"
          list="cargos-sugeridos"
          value={cargo}
          onChange={(e) => setCargo(e.target.value)}
          autoComplete="off"
        />
        <datalist id="cargos-sugeridos">
          {CARGOS_SUGERIDOS.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <Campo
        rotulo="Telefone (opcional)"
        name="telefone"
        type="tel"
        inputMode="tel"
        value={telefone}
        onChange={(e) => setTelefone(e.target.value)}
        autoComplete="off"
      />
      <Campo
        rotulo="Chave PIX (opcional)"
        name="chave_pix"
        value={chavePix}
        onChange={(e) => setChavePix(e.target.value)}
        autoComplete="off"
      />
      <Campo
        rotulo="Diária padrão (R$)"
        name="diaria_padrao"
        inputMode="decimal"
        value={diaria}
        onChange={(e) => setDiaria(e.target.value)}
        autoComplete="off"
      />
      <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          checked={ativo}
          onChange={(e) => setAtivo(e.target.checked)}
          className="size-5"
        />
        Ativo (aparece na alocação de obras)
      </label>

      {erro && (
        <p role="alert" className="text-sm text-red-700">
          {erro}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <button type="submit" disabled={salvando} className={classeBotaoPrimario}>
          {salvando ? 'Salvando…' : funcionario ? 'Salvar alterações' : 'Cadastrar funcionário'}
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
