import { describe, expect, it } from 'vitest';
import { contarPendentes, filtrarPorStatus, type LeadResumo } from './leads';

const leads: LeadResumo[] = [
  { id: 1, status: 'Pendente de Contato' },
  { id: 2, status: 'Em Negociação' },
  { id: 3, status: 'Pendente de Contato' },
  { id: 4, status: 'Fechado' },
];

describe('contarPendentes', () => {
  it('deve contar só os leads pendentes de contato quando há vários status', () => {
    expect(contarPendentes(leads)).toBe(2);
  });

  it('deve retornar 0 quando a lista está vazia', () => {
    expect(contarPendentes([])).toBe(0);
  });
});

describe('filtrarPorStatus', () => {
  it('deve retornar todos quando o filtro é "Todos"', () => {
    expect(filtrarPorStatus(leads, 'Todos')).toHaveLength(4);
  });

  it('deve retornar só os do status escolhido quando o filtro é um status', () => {
    expect(filtrarPorStatus(leads, 'Pendente de Contato').map((l) => l.id)).toEqual([1, 3]);
  });

  it('deve retornar lista vazia quando nenhum lead tem o status', () => {
    expect(filtrarPorStatus(leads, 'Perdido')).toEqual([]);
  });
});
