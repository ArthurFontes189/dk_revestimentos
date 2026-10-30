import { describe, expect, it } from 'vitest';
import { novaObraSchema, obraDaConversaoSchema, obraSchema, totaisDoCliente } from './obraSchema';

const base = {
  client_id: 7,
  descricao: 'Painel ripado na sala',
  materiais: '',
  forma_pagamento: '',
  responsavel: '',
  data_entrega: '',
  valor_total: 'R$ 12.500,00',
  status: 'A Iniciar',
};

describe('obraSchema', () => {
  it('deve converter o valor e esvaziar os opcionais quando só o básico é informado', () => {
    expect(obraSchema.parse(base)).toEqual({
      client_id: 7,
      descricao: 'Painel ripado na sala',
      materiais: null,
      forma_pagamento: null,
      responsavel: null,
      data_entrega: null,
      valor_total: 12500,
      status: 'A Iniciar',
    });
  });

  it('deve aceitar a data de entrega quando ela é uma data real', () => {
    expect(obraSchema.parse({ ...base, data_entrega: '2026-12-15' }).data_entrega).toBe(
      '2026-12-15',
    );
  });

  it('deve recusar quando a data de entrega não existe no calendário', () => {
    expect(obraSchema.safeParse({ ...base, data_entrega: '2026-02-30' }).success).toBe(false);
  });

  it('deve recusar quando o valor total não é um valor', () => {
    expect(obraSchema.safeParse({ ...base, valor_total: 'muito' }).success).toBe(false);
  });

  it('deve recusar quando a descrição é curta demais', () => {
    expect(obraSchema.safeParse({ ...base, descricao: 'ab' }).success).toBe(false);
  });

  it('deve recusar quando o status não existe', () => {
    expect(obraSchema.safeParse({ ...base, status: 'Cancelada' }).success).toBe(false);
  });

  it('deve recusar quando o cliente não foi escolhido', () => {
    expect(obraSchema.safeParse({ ...base, client_id: 0 }).success).toBe(false);
  });
});

describe('novaObraSchema', () => {
  it('deve ler a entrada inicial quando ela cabe no valor total', () => {
    expect(novaObraSchema.parse({ ...base, valor_entrada: '5.000,00' }).valor_entrada).toBe(5000);
  });

  it('deve assumir entrada zero quando o campo está vazio', () => {
    expect(novaObraSchema.parse({ ...base, valor_entrada: '' }).valor_entrada).toBe(0);
  });

  it('deve recusar quando a entrada passa do valor total', () => {
    const resultado = novaObraSchema.safeParse({ ...base, valor_entrada: '12.500,01' });
    expect(resultado.success).toBe(false);
  });
});

describe('totaisDoCliente', () => {
  it('deve somar contratado e pago e calcular o saldo quando há obras e entradas', () => {
    const totais = totaisDoCliente(
      [{ valor_total: 10000 }, { valor_total: 2500.5 }],
      [
        { tipo: 'entrada', valor: 4000 },
        { tipo: 'entrada', valor: 500.25 },
      ],
    );
    expect(totais).toEqual({ contratado: 12500.5, pago: 4500.25, saldo: 8000.25 });
  });

  it('deve ignorar as saídas quando calcula o total pago', () => {
    const totais = totaisDoCliente(
      [{ valor_total: 1000 }],
      [
        { tipo: 'entrada', valor: 300 },
        { tipo: 'saida', valor: 9999 },
      ],
    );
    expect(totais.pago).toBe(300);
  });

  it('deve zerar o saldo quando o cliente pagou mais que o contratado', () => {
    expect(totaisDoCliente([{ valor_total: 100 }], [{ tipo: 'entrada', valor: 150 }]).saldo).toBe(
      0,
    );
  });

  it('deve devolver zeros quando o cliente não tem obras nem entradas', () => {
    expect(totaisDoCliente([], [])).toEqual({ contratado: 0, pago: 0, saldo: 0 });
  });
});

describe('obraDaConversaoSchema', () => {
  const semCliente = { ...base, client_id: undefined };

  it('deve aceitar a obra sem cliente quando a entrada cabe no total', () => {
    const obra = obraDaConversaoSchema.parse({ ...semCliente, valor_entrada: '2.000,00' });
    expect(obra).toMatchObject({ valor_total: 12500, valor_entrada: 2000 });
    expect(obra).not.toHaveProperty('client_id');
  });

  it('deve recusar quando a entrada passa do valor total', () => {
    const resultado = obraDaConversaoSchema.safeParse({ ...semCliente, valor_entrada: '13000' });
    expect(resultado.success).toBe(false);
  });
});
