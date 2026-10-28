-- E5: clientes e conversão de lead em cliente.
-- Mesma regra da base: RLS desde o início, revoke explícito (projeto Supabase compartilhado,
-- então os privilégios padrão do schema `public` não são alterados).

-- Código CLI-NNNN vem de uma sequência: único, sem colisão em uso simultâneo e nunca
-- reaproveitado depois que um cliente é excluído (a v1 contava linhas e repetia códigos).
create sequence public.clients_codigo_seq;

create table public.clients (
  id bigint generated always as identity primary key,
  codigo text not null unique
    default ('CLI-' || lpad(nextval('public.clients_codigo_seq')::text, 4, '0')),
  nome text not null check (char_length(nome) between 2 and 100),
  -- Sempre só dígitos, sem DDI: DDD + número. A conversão do lead aplica a mesma regra.
  telefone text not null unique check (telefone ~ '^[0-9]{10,11}$'),
  -- Opcional; a conferência dos dígitos verificadores é feita na borda (@dk/core).
  cpf text unique check (cpf ~ '^[0-9]{11}$'),
  endereco text check (char_length(endereco) <= 300),
  obs text check (char_length(obs) <= 1000),
  -- Lead de origem: permite ver de qual anúncio veio o cliente. Excluir o lead não apaga o cliente.
  lead_id bigint references public.leads (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

alter table public.clients enable row level security;

revoke all on public.clients from anon, authenticated;
revoke all on sequence public.clients_id_seq from anon, authenticated;
revoke all on sequence public.clients_codigo_seq from anon, authenticated;

grant select, insert, update, delete on public.clients to authenticated;
-- O default do código chama nextval com o privilégio de quem insere.
grant usage on sequence public.clients_codigo_seq to authenticated;

create policy clients_admin_all on public.clients
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Converte um lead em cliente numa única transação: localiza o cliente pelo telefone (ou cria)
-- e fecha o lead. Obra e entrada no caixa serão acrescentadas nas entregas E6 e E8.
create function public.converter_lead(p_lead_id bigint)
returns table (cliente_id bigint, codigo text, cliente_novo boolean)
language plpgsql
set search_path = ''
as $$
declare
  v_lead public.leads;
  v_telefone text;
  v_cliente public.clients;
begin
  if not public.is_admin() then
    raise exception 'acesso negado' using errcode = '42501';
  end if;

  -- Trava o lead: duas conversões simultâneas do mesmo lead não passam juntas.
  select * into v_lead from public.leads where id = p_lead_id for update;
  if not found then
    raise exception 'lead não encontrado' using errcode = 'P0002';
  end if;
  if v_lead.status = 'Fechado' then
    raise exception 'lead já convertido';
  end if;

  -- Mesma regra de normalizarTelefone (@dk/core): tira o DDI 55 de números com 12+ dígitos.
  v_telefone := v_lead.telefone;
  if length(v_telefone) >= 12 and left(v_telefone, 2) = '55' then
    v_telefone := substr(v_telefone, 3);
  end if;
  if v_telefone !~ '^[0-9]{10,11}$' then
    raise exception 'telefone do lead inválido';
  end if;

  -- on conflict cobre o caso de outro cliente com o mesmo telefone ser criado ao mesmo tempo.
  insert into public.clients (nome, telefone, lead_id)
  values (v_lead.nome, v_telefone, v_lead.id)
  on conflict (telefone) do nothing
  returning * into v_cliente;

  if found then
    cliente_novo := true;
  else
    select * into v_cliente from public.clients where telefone = v_telefone;
    cliente_novo := false;
  end if;

  update public.leads set status = 'Fechado' where id = v_lead.id;

  cliente_id := v_cliente.id;
  codigo := v_cliente.codigo;
  return next;
end;
$$;

revoke all on function public.converter_lead(bigint) from public, anon;
grant execute on function public.converter_lead(bigint) to authenticated;
