import { describe, expect, it } from 'vitest';
import {
  filtrarLancamentos,
  formatarDataBR,
  lancamentoSchema,
  origemDoLancamento,
  periodoDoAtalho,
} from './lancamento';

const saida = {
  tipo: 'saida',
  categoria: 'Custos Oficina',
  descricao: 'Conta de luz',
  valor: 'R$ 1.234,56',
  data: '2026-10-30',
};

describe('lancamentoSchema', () => {
  it('deve ler o valor e a data quando a saída manual é válida', () => {
    expect(lancamentoSchema.parse(saida)).toEqual({
      tipo: 'saida',
      categoria: 'Custos Oficina',
      descricao: 'Conta de luz',
      valor: 1234.56,
      data: '2026-10-30',
    });
  });

  it('deve esvaziar a descrição quando ela não é informada', () => {
    expect(lancamentoSchema.parse({ ...saida, descricao: '  ' }).descricao).toBeNull();
  });

  it('deve aceitar só Outras entradas quando o lançamento manual é entrada', () => {
    const entrada = { ...saida, tipo: 'entrada' };
    expect(lancamentoSchema.safeParse({ ...entrada, categoria: 'Outras entradas' }).success).toBe(
      true,
    );
    expect(lancamentoSchema.safeParse({ ...entrada, categoria: 'Entrada da obra' }).success).toBe(
      false,
    );
  });

  it('deve recusar categoria automática quando o lançamento é manual', () => {
    expect(lancamentoSchema.safeParse({ ...saida, categoria: 'Diárias' }).success).toBe(false);
  });

  it('deve recusar valor zero ou inválido', () => {
    expect(lancamentoSchema.safeParse({ ...saida, valor: '0' }).success).toBe(false);
    expect(lancamentoSchema.safeParse({ ...saida, valor: 'abc' }).success).toBe(false);
  });

  it('deve recusar data que não existe no calendário', () => {
    expect(lancamentoSchema.safeParse({ ...saida, data: '2026-02-30' }).success).toBe(false);
  });
});

describe('periodoDoAtalho', () => {
  it('deve devolver o mês inteiro quando o atalho é o mês atual', () => {
    expect(periodoDoAtalho('mes', new Date(2026, 9, 30))).toEqual({
      de: '2026-10-01',
      ate: '2026-10-31',
    });
  });

  it('deve respeitar o fevereiro de ano bissexto', () => {
    expect(periodoDoAtalho('mes', new Date(2028, 1, 10)).ate).toBe('2028-02-29');
  });

  it('deve voltar para dezembro do ano anterior quando o atalho é o mês passado em janeiro', () => {
    expect(periodoDoAtalho('mes-passado', new Date(2027, 0, 5))).toEqual({
      de: '2026-12-01',
      ate: '2026-12-31',
    });
  });

  it('deve devolver o ano inteiro quando o atalho é o ano', () => {
    expect(periodoDoAtalho('ano', new Date(2026, 5, 15))).toEqual({
      de: '2026-01-01',
      ate: '2026-12-31',
    });
  });

  it('deve manter o dia local quando a hora é perto da meia-noite', () => {
    expect(periodoDoAtalho('mes', new Date(2026, 9, 31, 23, 59)).de).toBe('2026-10-01');
  });
});

describe('filtrarLancamentos', () => {
  const lancamentos = [
    { data: '2026-09-30', categoria: 'Vernizes' },
    { data: '2026-10-01', categoria: 'Vernizes' },
    { data: '2026-10-15', categoria: 'Diárias' },
    { data: '2026-10-31', categoria: 'Vernizes' },
    { data: '2026-11-01', categoria: 'Vernizes' },
  ];

  it('deve incluir as duas pontas do período', () => {
    const filtrados = filtrarLancamentos(lancamentos, {
      de: '2026-10-01',
      ate: '2026-10-31',
      categoria: '',
    });
    expect(filtrados.map((l) => l.data)).toEqual(['2026-10-01', '2026-10-15', '2026-10-31']);
  });

  it('deve filtrar por categoria quando ela é informada', () => {
    const filtrados = filtrarLancamentos(lancamentos, { de: '', ate: '', categoria: 'Diárias' });
    expect(filtrados).toHaveLength(1);
  });

  it('deve devolver tudo quando nenhum filtro é informado', () => {
    expect(filtrarLancamentos(lancamentos, { de: '', ate: '', categoria: '' })).toHaveLength(5);
  });
});

describe('formatarDataBR', () => {
  it('deve inverter a data ISO para dia/mês/ano', () => {
    expect(formatarDataBR('2026-10-30')).toBe('30/10/2026');
  });
});

describe('origemDoLancamento', () => {
  it('deve classificar pelo vínculo do lançamento', () => {
    expect(origemDoLancamento({ service_id: null, worker_id: null, expense_id: null })).toBe(
      'manual',
    );
    expect(origemDoLancamento({ service_id: 1, worker_id: null, expense_id: null })).toBe(
      'entrada-de-obra',
    );
    expect(origemDoLancamento({ service_id: 1, worker_id: 3, expense_id: null })).toBe(
      'automatico',
    );
    expect(origemDoLancamento({ service_id: 1, worker_id: null, expense_id: 4 })).toBe(
      'automatico',
    );
  });
});
