-- E1: base do banco da v2 (enums, admin, leads) com RLS desde o início.
-- Regra do projeto: nenhuma tabela nasce com GRANT amplo ao anon.

-- Este projeto Supabase é compartilhado com outro app, então NÃO alteramos os privilégios
-- padrão do schema `public`. Em vez disso, cada objeto da DK revoga o acesso herdado e
-- concede, de forma explícita, só o necessário.

-- Enums (valores iguais aos da v1, ver docs/DIAGNOSTICO-V1.md seção 5)
create type public.status_lead as enum (
  'Pendente de Contato',
  'Em Negociação',
  'Fechado',
  'Perdido'
);

create type public.tipo_servico as enum (
  'Painéis & Revestimentos',
  'Marcenaria Sob Medida',
  'Cozinhas, Closets & Suítes',
  'Ambientes Externos',
  'Espaço Corporativo / Comercial',
  'Outro Projeto Personalizado'
);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Função de trigger: ninguém precisa chamá-la pela API.
revoke all on function public.set_updated_at() from public, anon, authenticated;

-- Admins: lista de usuários com acesso ao painel. Hoje há um só.
-- Sem policies: ninguém lê nem escreve pela API; só o dono do banco (SQL Editor/migrations).
create table public.admins (
  user_id uuid primary key,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

-- security definer: lê `admins` mesmo com RLS ligado, sem expor a tabela.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Leads
create table public.leads (
  id bigint generated always as identity primary key,
  nome text not null check (char_length(nome) between 2 and 100),
  telefone text not null check (telefone ~ '^[0-9]{10,13}$'),
  bairro text check (char_length(bairro) <= 100),
  tipo_servico public.tipo_servico not null,
  mensagem text check (char_length(mensagem) <= 1000),
  status public.status_lead not null default 'Pendente de Contato',
  utm_source text check (char_length(utm_source) <= 200),
  utm_medium text check (char_length(utm_medium) <= 200),
  utm_campaign text check (char_length(utm_campaign) <= 200),
  fbclid text check (char_length(fbclid) <= 500),
  pagina_entrada text check (char_length(pagina_entrada) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_status_created_at_idx on public.leads (status, created_at desc);

create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

alter table public.leads enable row level security;

-- Remove qualquer acesso herdado (o Supabase concede tudo ao anon/authenticated por padrão).
revoke all on public.leads from anon, authenticated;
revoke all on sequence public.leads_id_seq from anon, authenticated;

-- Visitante (anon): só INSERT, e só nas colunas do formulário (não escolhe status, id nem datas).
grant insert (
  nome, telefone, bairro, tipo_servico, mensagem,
  utm_source, utm_medium, utm_campaign, fbclid, pagina_entrada
) on public.leads to anon;

-- Admin logado: acesso total, restrito pela policy abaixo.
grant select, insert, update, delete on public.leads to authenticated;

create policy leads_anon_insert on public.leads
  for insert to anon
  with check (status = 'Pendente de Contato');

create policy leads_admin_all on public.leads
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
