import { describe, expect, it } from 'vitest';
import { alocacaoSchema, funcionarioSchema, insumoSchema } from './equipe';

const funcionario = {
  nome: 'José Ribeiro',
  cargo: 'Marceneiro Líder',
  telefone: '(61) 99999-1234',
  chave_pix: '61999991234',
  diaria_padrao: '250,00',
  ativo: true,
};

describe('funcionarioSchema', () => {
  it('deve normalizar telefone e diária quando o cadastro está completo', () => {
    expect(funcionarioSchema.parse(funcionario)).toEqual({
      nome: 'José Ribeiro',
      cargo: 'Marceneiro Líder',
      telefone: '61999991234',
      chave_pix: '61999991234',
      diaria_padrao: 250,
      ativo: true,
    });
  });

  it('deve esvaziar os opcionais quando só o nome e a diária são informados', () => {
    const dados = funcionarioSchema.parse({
      ...funcionario,
      cargo: '',
      telefone: '',
      chave_pix: '',
    });
    expect(dados).toMatchObject({ cargo: null, telefone: null, chave_pix: null });
  });

  it('deve aceitar diária zero quando o valor ainda não foi combinado', () => {
    expect(funcionarioSchema.parse({ ...funcionario, diaria_padrao: '0' }).diaria_padrao).toBe(0);
  });

  it('deve recusar telefone com tamanho inválido', () => {
    expect(funcionarioSchema.safeParse({ ...funcionario, telefone: '1234' }).success).toBe(false);
  });

  it('deve recusar nome curto demais', () => {
    expect(funcionarioSchema.safeParse({ ...funcionario, nome: 'J' }).success).toBe(false);
  });
});

describe('alocacaoSchema', () => {
  const alocacao = { employee_id: 3, valor_diaria: '250,00', dias_trabalhados: '4' };

  it('deve ler diária e dias quando a alocação é válida', () => {
    expect(alocacaoSchema.parse(alocacao)).toEqual({
      employee_id: 3,
      valor_diaria: 250,
      dias_trabalhados: 4,
    });
  });

  it('deve recusar diária zero porque a alocação precisa ter custo', () => {
    expect(alocacaoSchema.safeParse({ ...alocacao, valor_diaria: '0' }).success).toBe(false);
  });

  it('deve recusar dias fracionados ou zerados', () => {
    expect(alocacaoSchema.safeParse({ ...alocacao, dias_trabalhados: '1,5' }).success).toBe(false);
    expect(alocacaoSchema.safeParse({ ...alocacao, dias_trabalhados: '0' }).success).toBe(false);
  });

  it('deve recusar quando o funcionário não foi escolhido', () => {
    expect(alocacaoSchema.safeParse({ ...alocacao, employee_id: 0 }).success).toBe(false);
  });
});

describe('insumoSchema', () => {
  const insumo = {
    categoria: 'Ferragens',
    descricao: 'Dobradiças 35 mm',
    valor: 'R$ 89,90',
    lancar_no_caixa: true,
  };

  it('deve ler o valor quando o insumo é válido', () => {
    expect(insumoSchema.parse(insumo)).toMatchObject({ valor: 89.9, lancar_no_caixa: true });
  });

  it('deve recusar categoria que não existe', () => {
    expect(insumoSchema.safeParse({ ...insumo, categoria: 'Diversos' }).success).toBe(false);
  });

  it('deve recusar valor zero', () => {
    expect(insumoSchema.safeParse({ ...insumo, valor: '0' }).success).toBe(false);
  });
});
