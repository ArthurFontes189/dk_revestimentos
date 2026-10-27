import { describe, expect, it } from 'vitest';
import { montarMensagemOrcamento } from './mensagem';

describe('montarMensagemOrcamento', () => {
  it('deve montar a mensagem completa quando todos os campos são informados', () => {
    const texto = montarMensagemOrcamento({
      nome: 'Maria Souza',
      tipo_servico: 'Cozinhas, Closets & Suítes',
      bairro: 'Asa Sul',
      mensagem: 'Cozinha de 12 m²',
    });
    expect(texto).toBe(
      [
        'Olá! Meu nome é Maria Souza e gostaria de um orçamento.',
        'Serviço: Cozinhas, Closets & Suítes',
        'Bairro: Asa Sul',
        'Detalhes: Cozinha de 12 m²',
      ].join('\n'),
    );
  });

  it('deve omitir bairro e detalhes quando não são informados', () => {
    const texto = montarMensagemOrcamento({
      nome: 'João',
      tipo_servico: 'Ambientes Externos',
    });
    expect(texto).toBe(
      ['Olá! Meu nome é João e gostaria de um orçamento.', 'Serviço: Ambientes Externos'].join(
        '\n',
      ),
    );
  });

  it('deve omitir bairro e detalhes quando só têm espaços', () => {
    const texto = montarMensagemOrcamento({
      nome: 'João',
      tipo_servico: 'Ambientes Externos',
      bairro: '   ',
      mensagem: '',
    });
    expect(texto).not.toContain('Bairro');
    expect(texto).not.toContain('Detalhes');
  });
});
