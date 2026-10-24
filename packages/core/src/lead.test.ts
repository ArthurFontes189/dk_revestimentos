import { describe, expect, it } from 'vitest';
import { leadSchema } from './lead';

const valido = {
  nome: 'Maria Souza',
  telefone: '(61) 99999-1234',
  tipo_servico: 'Marcenaria Sob Medida',
};

describe('leadSchema', () => {
  it('deve limpar o telefone quando o lead mínimo é válido', () => {
    expect(leadSchema.parse(valido).telefone).toBe('61999991234');
  });
  it('deve rejeitar quando o nome é curto demais', () => {
    expect(leadSchema.safeParse({ ...valido, nome: 'A' }).success).toBe(false);
  });
  it('deve rejeitar quando o telefone é curto demais', () => {
    expect(leadSchema.safeParse({ ...valido, telefone: '9999' }).success).toBe(false);
  });
  it('deve rejeitar quando o tipo de serviço é desconhecido', () => {
    expect(leadSchema.safeParse({ ...valido, tipo_servico: 'Qualquer' }).success).toBe(false);
  });
  it('deve guardar a origem da campanha quando ela é informada', () => {
    const r = leadSchema.parse({ ...valido, utm_source: 'instagram', fbclid: 'abc' });
    expect(r.utm_source).toBe('instagram');
  });
});
