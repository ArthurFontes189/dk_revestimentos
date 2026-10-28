import { describe, expect, it } from 'vitest';
import { buscarClientes, clienteSchema, type ClienteBuscavel } from './cliente';

const base = { nome: 'Maria Souza', telefone: '(61) 99999-1234', cpf: '', endereco: '', obs: '' };

describe('clienteSchema', () => {
  it('deve normalizar telefone e esvaziar campos opcionais quando só o básico é informado', () => {
    expect(clienteSchema.parse(base)).toEqual({
      nome: 'Maria Souza',
      telefone: '61999991234',
      cpf: null,
      endereco: null,
      obs: null,
    });
  });

  it('deve tirar o DDI 55 do telefone quando ele vem com código do país', () => {
    expect(clienteSchema.parse({ ...base, telefone: '+55 61 99999-1234' }).telefone).toBe(
      '61999991234',
    );
  });

  it('deve guardar só os dígitos do CPF quando ele é válido', () => {
    expect(clienteSchema.parse({ ...base, cpf: '529.982.247-25' }).cpf).toBe('52998224725');
  });

  it('deve recusar quando o CPF é inválido', () => {
    expect(clienteSchema.safeParse({ ...base, cpf: '111.111.111-11' }).success).toBe(false);
  });

  it('deve recusar quando o telefone tem tamanho inválido', () => {
    expect(clienteSchema.safeParse({ ...base, telefone: '9999' }).success).toBe(false);
  });

  it('deve recusar quando o nome é curto demais', () => {
    expect(clienteSchema.safeParse({ ...base, nome: 'A' }).success).toBe(false);
  });
});

describe('buscarClientes', () => {
  const clientes: ClienteBuscavel[] = [
    { codigo: 'CLI-0001', nome: 'Maria Souza', telefone: '61999991234', cpf: '52998224725' },
    { codigo: 'CLI-0002', nome: 'João Álvares', telefone: '61988887777', cpf: null },
  ];

  it('deve devolver todos quando a busca está vazia', () => {
    expect(buscarClientes(clientes, '  ')).toHaveLength(2);
  });

  it('deve ignorar acento e maiúscula quando busca pelo nome', () => {
    expect(buscarClientes(clientes, 'joao alvares').map((c) => c.codigo)).toEqual(['CLI-0002']);
  });

  it('deve achar pelo telefone quando a busca vem formatada', () => {
    expect(buscarClientes(clientes, '(61) 98888').map((c) => c.codigo)).toEqual(['CLI-0002']);
  });

  it('deve achar pelo CPF quando a busca vem com pontuação', () => {
    expect(buscarClientes(clientes, '529.982').map((c) => c.codigo)).toEqual(['CLI-0001']);
  });

  it('deve achar pelo código quando a busca é o código', () => {
    expect(buscarClientes(clientes, 'cli-0002').map((c) => c.codigo)).toEqual(['CLI-0002']);
  });
});
