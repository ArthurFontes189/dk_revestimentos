import { describe, expect, it } from 'vitest';
import { LIMITE_IMAGEM_BYTES, LIMITE_VIDEO_BYTES, validarImagem, validarVideo } from './validar';

const MB = 1024 * 1024;

describe('validarImagem', () => {
  it('deve aceitar JPEG, PNG e WebP quando o tamanho é razoável', () => {
    expect(validarImagem({ type: 'image/jpeg', size: 2 * MB })).toBeNull();
    expect(validarImagem({ type: 'image/png', size: 2 * MB })).toBeNull();
    expect(validarImagem({ type: 'image/webp', size: 2 * MB })).toBeNull();
  });

  it('deve recusar o formato quando não é uma imagem suportada pelo navegador', () => {
    expect(validarImagem({ type: 'image/gif', size: MB })).toMatch(/JPEG, PNG ou WebP/);
    expect(validarImagem({ type: 'application/pdf', size: MB })).toMatch(/JPEG, PNG ou WebP/);
  });

  it('deve recusar a imagem quando passa do limite', () => {
    expect(validarImagem({ type: 'image/jpeg', size: LIMITE_IMAGEM_BYTES + 1 })).toMatch(/15 MB/);
  });

  it('deve aceitar exatamente o limite quando o arquivo tem o tamanho máximo', () => {
    expect(validarImagem({ type: 'image/jpeg', size: LIMITE_IMAGEM_BYTES })).toBeNull();
  });

  it('deve recusar o arquivo vazio quando não há conteúdo', () => {
    expect(validarImagem({ type: 'image/jpeg', size: 0 })).toMatch(/vazio/);
  });
});

describe('validarVideo', () => {
  it('deve aceitar MP4 quando está dentro do limite', () => {
    expect(validarVideo({ type: 'video/mp4', size: 10 * MB })).toBeNull();
  });

  it('deve recusar o formato quando não é MP4', () => {
    expect(validarVideo({ type: 'video/quicktime', size: MB })).toMatch(/MP4/);
  });

  it('deve orientar a comprimir ou usar YouTube quando o vídeo passa do limite', () => {
    const mensagem = validarVideo({ type: 'video/mp4', size: LIMITE_VIDEO_BYTES + 1 });
    expect(mensagem).toMatch(/25 MB/);
    expect(mensagem).toMatch(/comprim/i);
  });
});
