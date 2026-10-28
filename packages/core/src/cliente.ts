import { z } from 'zod';
import { cpfValido, somenteDigitos } from './cpf';
import { normalizarTelefone } from './telefone';

const textoOpcional = (limite: number) =>
  z
    .string()
    .trim()
    .max(limite)
    .transform((valor) => (valor === '' ? null : valor));

/** Cadastro de cliente no painel. Telefone e CPF são gravados só com dígitos (o banco confere). */
export const clienteSchema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome').max(100),
  telefone: z
    .string()
    .transform(normalizarTelefone)
    .pipe(z.string().regex(/^\d{10,11}$/, 'Telefone inválido')),
  cpf: z
    .string()
    .transform(somenteDigitos)
    .refine((valor) => valor === '' || cpfValido(valor), 'CPF inválido')
    .transform((valor) => (valor === '' ? null : valor)),
  endereco: textoOpcional(300),
  obs: textoOpcional(1000),
});

export type DadosCliente = z.infer<typeof clienteSchema>;

export interface ClienteBuscavel {
  codigo: string;
  nome: string;
  telefone: string;
  cpf: string | null;
}

function semAcento(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** Filtra por nome, código, telefone ou CPF; ignora acento, maiúscula e pontuação. */
export function buscarClientes<T extends ClienteBuscavel>(clientes: T[], busca: string): T[] {
  const texto = semAcento(busca.trim());
  if (texto === '') return clientes;
  const digitos = somenteDigitos(texto);
  return clientes.filter(
    (cliente) =>
      semAcento(cliente.nome).includes(texto) ||
      cliente.codigo.toLowerCase().includes(texto) ||
      (digitos !== '' &&
        (cliente.telefone.includes(digitos) || (cliente.cpf?.includes(digitos) ?? false))),
  );
}
