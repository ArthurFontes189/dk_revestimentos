-- E6: fichas de produção (obras) e caixa como fonte única do valor recebido.
-- Mesma regra da base: RLS desde o início, revoke explícito (projeto Supabase compartilhado,
-- então os privilégios padrão do schema `public` não são alterados).

create type public.status_obra as enum (
  'A Iniciar',
  'Em Produção / Oficina',
  'Em Montagem / Obra',
  'Concluído'
);

create type public.tipo_transacao as enum ('entrada', 'saida');

-- Cliente com obra não pode ser excluído (restrict): o painel explica o motivo.
create table public.services (
  id bigint generated always as identity primary key,
  client_id bigint not null references public.clients (id) on delete restrict,
  lead_id bigint references public.leads (id) on delete set null,
  descricao text not null check (char_length(descricao) between 3 and 300),
  materiais text check (char_length(materiais) <= 1000),
  forma_pagamento text check (char_length(forma_pagamento) <= 300),
  responsavel text check (char_length(responsavel) <= 100),
  data_entrega date,
  valor_total numeric(12, 2) not null default 0 check (valor_total >= 0),
  status public.status_obra not null default 'A Iniciar',
  concluida_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index services_client_id_idx on public.services (client_id);

create trigger services_set_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

-- O banco preenche a data de conclusão: o painel não precisa lembrar de enviá-la.
create function public.services_marcar_conclusao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'Concluído' then
    if tg_op = 'INSERT' or old.status is distinct from 'Concluído' then
      new.concluida_em := now();
    end if;
  else
    new.concluida_em := null;
  end if;
  return new;
end;
$$;

create trigger services_conclusao
  before insert or update on public.services
  for each row execute function public.services_marcar_conclusao();

-- Lançamentos do caixa. Excluir a obra apaga os lançamentos ligados (a v1 deixava lixo).
create table public.transactions (
  id bigint generated always as identity primary key,
  tipo public.tipo_transacao not null,
  categoria text not null check (char_length(categoria) between 1 and 60),
  descricao text check (char_length(descricao) <= 300),
  valor numeric(12, 2) not null check (valor > 0),
  data date not null default current_date,
  client_id bigint references public.clients (id) on delete set null,
  service_id bigint references public.services (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index transactions_service_id_idx on public.transactions (service_id);
create index transactions_client_id_idx on public.transactions (client_id);

-- Um único lançamento "Entrada da obra" por obra: é ele que definir_recebido ajusta.
create unique index transactions_entrada_obra_unica
  on public.transactions (service_id)
  where categoria = 'Entrada da obra' and tipo = 'entrada';

alter table public.services enable row level security;
alter table public.transactions enable row level security;

revoke all on public.services, public.transactions from anon, authenticated;
revoke all on sequence public.services_id_seq, public.transactions_id_seq from anon, authenticated;

grant select, insert, update, delete on public.services, public.transactions to authenticated;
grant usage on sequence public.services_id_seq, public.transactions_id_seq to authenticated;

create policy services_admin_all on public.services
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy transactions_admin_all on public.transactions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Valor recebido = soma das ENTRADAS ligadas à obra. Não existe valor_entrada na obra,
-- então obra e caixa nunca divergem. security_invoker aplica a RLS de quem consulta.
create view public.obras_resumo
with (security_invoker = true) as
select
  s.*,
  coalesce(t.recebido, 0)::numeric(12, 2) as valor_recebido,
  greatest(s.valor_total - coalesce(t.recebido, 0), 0)::numeric(12, 2) as saldo
from public.services s
left join lateral (
  select sum(valor) as recebido
  from public.transactions
  where service_id = s.id and tipo = 'entrada'
) t on true;

revoke all on public.obras_resumo from anon, authenticated;
grant select on public.obras_resumo to authenticated;

-- Ajusta o lançamento único "Entrada da obra" para o valor informado; zero remove.
create function public.definir_recebido(p_obra_id bigint, p_valor numeric)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_obra public.services;
  v_outras numeric;
begin
  if not public.is_admin() then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  if p_valor is null or p_valor < 0 then
    raise exception 'valor inválido';
  end if;

  select * into v_obra from public.services where id = p_obra_id for update;
  if not found then
    raise exception 'obra não encontrada' using errcode = 'P0002';
  end if;

  -- Outras entradas (quitações avulsas) também contam para o limite do valor total.
  select coalesce(sum(valor), 0) into v_outras
  from public.transactions
  where service_id = p_obra_id and tipo = 'entrada' and categoria <> 'Entrada da obra';
  if p_valor + v_outras > v_obra.valor_total then
    raise exception 'o recebido não pode passar do valor total da obra';
  end if;

  if p_valor = 0 then
    delete from public.transactions
    where service_id = p_obra_id and tipo = 'entrada' and categoria = 'Entrada da obra';
    return;
  end if;

  insert into public.transactions (tipo, categoria, descricao, valor, client_id, service_id)
  values ('entrada', 'Entrada da obra', v_obra.descricao, p_valor, v_obra.client_id, p_obra_id)
  on conflict (service_id) where categoria = 'Entrada da obra' and tipo = 'entrada'
  do update set valor = excluded.valor;
end;
$$;

-- Acrescenta uma entrada (quitação rápida = saldo inteiro). Recusa passar do valor total.
create function public.registrar_recebimento(p_obra_id bigint, p_valor numeric)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_obra public.services;
  v_recebido numeric;
begin
  if not public.is_admin() then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  if p_valor is null or p_valor <= 0 then
    raise exception 'valor inválido';
  end if;

  select * into v_obra from public.services where id = p_obra_id for update;
  if not found then
    raise exception 'obra não encontrada' using errcode = 'P0002';
  end if;

  select coalesce(sum(valor), 0) into v_recebido
  from public.transactions where service_id = p_obra_id and tipo = 'entrada';
  if v_recebido + p_valor > v_obra.valor_total then
    raise exception 'o recebido não pode passar do valor total da obra';
  end if;

  insert into public.transactions (tipo, categoria, descricao, valor, client_id, service_id)
  values ('entrada', 'Recebimento', v_obra.descricao, p_valor, v_obra.client_id, p_obra_id);
end;
$$;

-- converter_lead ganha o parâmetro opcional `obra` (jsonb). Sem ele, é igual à E5;
-- com ele, cria também a ficha e a entrada inicial, tudo na mesma transação.
-- Troca de assinatura: a versão antiga (só lead_id) sai para não haver chamada ambígua.
drop function public.converter_lead(bigint);

create function public.converter_lead(p_lead_id bigint, p_obra jsonb default null)
returns table (cliente_id bigint, codigo text, cliente_novo boolean, obra_id bigint)
language plpgsql
set search_path = ''
as $$
declare
  v_lead public.leads;
  v_telefone text;
  v_cliente public.clients;
  v_entrada numeric := 0;
  v_total numeric;
begin
  if not public.is_admin() then
    raise exception 'acesso negado' using errcode = '42501';
  end if;

  select * into v_lead from public.leads where id = p_lead_id for update;
  if not found then
    raise exception 'lead não encontrado' using errcode = 'P0002';
  end if;
  if v_lead.status = 'Fechado' then
    raise exception 'lead já convertido';
  end if;

  v_telefone := v_lead.telefone;
  if length(v_telefone) >= 12 and left(v_telefone, 2) = '55' then
    v_telefone := substr(v_telefone, 3);
  end if;
  if v_telefone !~ '^[0-9]{10,11}$' then
    raise exception 'telefone do lead inválido';
  end if;

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

  if p_obra is not null then
    v_total := coalesce((p_obra ->> 'valor_total')::numeric, 0);
    v_entrada := coalesce((p_obra ->> 'valor_entrada')::numeric, 0);
    if v_entrada < 0 or v_entrada > v_total then
      raise exception 'a entrada não pode passar do valor total da obra';
    end if;

    insert into public.services
      (client_id, lead_id, descricao, materiais, forma_pagamento, responsavel,
       data_entrega, valor_total, status)
    values (
      v_cliente.id,
      v_lead.id,
      p_obra ->> 'descricao',
      nullif(p_obra ->> 'materiais', ''),
      nullif(p_obra ->> 'forma_pagamento', ''),
      nullif(p_obra ->> 'responsavel', ''),
      nullif(p_obra ->> 'data_entrega', '')::date,
      v_total,
      coalesce((p_obra ->> 'status')::public.status_obra, 'A Iniciar')
    )
    returning id into obra_id;

    if v_entrada > 0 then
      insert into public.transactions (tipo, categoria, descricao, valor, client_id, service_id)
      values ('entrada', 'Entrada da obra', p_obra ->> 'descricao', v_entrada, v_cliente.id, obra_id);
    end if;
  end if;

  cliente_id := v_cliente.id;
  codigo := v_cliente.codigo;
  return next;
end;
$$;

revoke all on function public.definir_recebido(bigint, numeric) from public, anon;
revoke all on function public.registrar_recebimento(bigint, numeric) from public, anon;
revoke all on function public.converter_lead(bigint, jsonb) from public, anon;
grant execute on function public.definir_recebido(bigint, numeric) to authenticated;
grant execute on function public.registrar_recebimento(bigint, numeric) to authenticated;
grant execute on function public.converter_lead(bigint, jsonb) to authenticated;
