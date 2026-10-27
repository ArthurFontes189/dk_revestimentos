import { describe, expect, it } from 'vitest';
import { extrairOrigem, temOrigemDeCampanha } from './origem';

describe('extrairOrigem', () => {
  it('deve extrair utm e fbclid quando a URL tem parâmetros de campanha', () => {
    const origem = extrairOrigem(
      '?utm_source=instagram&utm_medium=cpc&utm_campaign=cozinhas&fbclid=IwAR123',
      '/dk_revestimentos/',
    );
    expect(origem).toEqual({
      utm_source: 'instagram',
      utm_medium: 'cpc',
      utm_campaign: 'cozinhas',
      fbclid: 'IwAR123',
      pagina_entrada: '/dk_revestimentos/',
    });
  });

  it('deve retornar só a página de entrada quando não há parâmetros', () => {
    expect(extrairOrigem('', '/')).toEqual({ pagina_entrada: '/' });
  });

  it('deve ignorar parâmetros vazios quando o valor está em branco', () => {
    expect(extrairOrigem('?utm_source=&utm_medium=cpc', '/')).toEqual({
      utm_medium: 'cpc',
      pagina_entrada: '/',
    });
  });

  it('deve limitar o tamanho quando o valor passa do máximo aceito pelo banco', () => {
    const origem = extrairOrigem(`?utm_source=${'a'.repeat(500)}`, '/');
    expect(origem.utm_source).toHaveLength(200);
  });

  it('deve ignorar parâmetros desconhecidos quando a URL tem outros campos', () => {
    expect(extrairOrigem('?foo=bar&utm_source=google', '/')).toEqual({
      utm_source: 'google',
      pagina_entrada: '/',
    });
  });
});

describe('temOrigemDeCampanha', () => {
  it('deve ser verdadeiro quando há utm_source', () => {
    expect(temOrigemDeCampanha({ utm_source: 'instagram', pagina_entrada: '/' })).toBe(true);
  });

  it('deve ser verdadeiro quando há só fbclid', () => {
    expect(temOrigemDeCampanha({ fbclid: 'abc', pagina_entrada: '/' })).toBe(true);
  });

  it('deve ser falso quando só há a página de entrada', () => {
    expect(temOrigemDeCampanha({ pagina_entrada: '/' })).toBe(false);
  });
});
