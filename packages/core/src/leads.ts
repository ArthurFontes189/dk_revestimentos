import type { StatusLead } from './enums';

export interface LeadResumo {
  id: number;
  status: StatusLead;
}

export type FiltroStatus = StatusLead | 'Todos';

/** Leads que ainda aguardam o primeiro contato (o contador do CRM). */
export function contarPendentes(leads: readonly LeadResumo[]): number {
  return leads.filter((lead) => lead.status === 'Pendente de Contato').length;
}

export function filtrarPorStatus<T extends LeadResumo>(
  leads: readonly T[],
  filtro: FiltroStatus,
): T[] {
  return filtro === 'Todos' ? [...leads] : leads.filter((lead) => lead.status === filtro);
}
