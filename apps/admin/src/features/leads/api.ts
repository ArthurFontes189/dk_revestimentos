import type { StatusLead } from '@dk/core';
import { supabase } from '../../lib/supabase';
import type { Lead } from './tipos';

function cliente() {
  if (!supabase) throw new Error('Supabase não configurado');
  return supabase;
}

export async function listarLeads(): Promise<Lead[]> {
  const { data, error } = await cliente()
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Lead[];
}

export async function atualizarStatusLead(id: number, status: StatusLead): Promise<void> {
  const { error } = await cliente().from('leads').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function excluirLead(id: number): Promise<void> {
  const { error } = await cliente().from('leads').delete().eq('id', id);
  if (error) throw error;
}
