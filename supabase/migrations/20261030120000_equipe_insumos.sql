-- E7: equipe, diárias e insumos por obra, com o caixa sempre acompanhando.
-- Mesma regra da base: RLS desde o início, revoke explícito (projeto Supabase compartilhado,
-- então os privilégios padrão do schema `public` e os objetos do outro app não são tocados).

create table public.employees (
  id bigint generated always as identity primary key,
  nome text not null check (char_length(nome) between 2 and 100),
  cargo text check (char_length(cargo) <= 60),
  -- Só dígitos, DDD + número (mesma regra de `clients`).
  telefone text check (telefone ~ '^[0-9]{10,11}$'),
  chave_pix text check (char_length(chave_pix) <= 140),
  diaria_padrao numeric(12, 2) not null default 0 check (diaria_padrao >= 0),
  ativo boolean not null default true,
  -- Caminho do arquivo no bucket privado `contratos`; o arquivo nunca fica no banco.
  contrato_path text check (char_length(contrato_path) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger employees_set_updated_at
  before update on public.employees
  for each row execute function public.set_updated_at();

-- Alocação do funcionário na obra. A diária é copiada de propósito: mudar a diária padrão
-- depois não reescreve o custo de obras antigas.
create table public.service_workers (
  id bigint generated always as identity primary key,
  service_id bigint not null references public.services (id) on delete cascade,
  employee_id bigint not null references public.employees (id) on delete restrict,
  valor_diaria numeric(12, 2) not null check (valor_diaria > 0),
  dias_trabalhados integer not null check (dias_trabalhados > 0),
  total_diarias numeric(12, 2) generated always as (valor_diaria * dias_trabalhados) stored,
  pago boolean not null default false,
  pago_em date,
  created_at timestamptz not null default now(),
  unique (service_id, employee_id)
);

create index service_workers_employee_id_idx on public.service_workers (employee_id);

create table public.service_expenses (
  id bigint generated always as identity primary key,
  service_id bigint not null references public.services (id) on delete cascade,
  categoria text not null check (char_length(categoria) between 1 and 60),
  descricao text not null check (char_length(descricao) between 2 and 200),
  valor numeric(12, 2) not null check (valor > 0),
  data date not null default current_date,
  created_at timestamptz not null default now()
);

create index service_expenses_service_id_idx on public.service_expenses (service_id);

-- Ligação com o caixa: o lançamento nasce e morre junto com a diária ou o insumo (cascata),
-- sem trigger de mão dupla.
alter table public.transactions
  add column worker_id bigint references public.service_workers (id) on delete cascade,
  add column expense_id bigint references public.service_expenses (id) on delete cascade;

create unique index transactions_worker_unica on public.transactions (worker_id)
  where worker_id is not null;
create unique index transactions_expense_unica on public.transactions (expense_id)
  where expense_id is not null;

alter table public.employees enable row level security;
alter table public.service_workers enable row level security;
alter table public.service_expenses enable row level security;

revoke all on public.employees, public.service_workers, public.service_expenses
  from anon, authenticated;
revoke all on sequence public.employees_id_seq, public.service_workers_id_seq,
  public.service_expenses_id_seq from anon, authenticated;

grant select, insert, update, delete
  on public.employees, public.service_workers, public.service_expenses to authenticated;
grant usage on sequence public.employees_id_seq, public.service_workers_id_seq,
  public.service_expenses_id_seq to authenticated;

create policy employees_admin_all on public.employees
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy service_workers_admin_all on public.service_workers
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy service_expenses_admin_all on public.service_expenses
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Se a diária ou os dias mudam depois de paga, a saída do caixa acompanha.
create function public.service_workers_sincroniza_caixa()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.transactions set valor = new.total_diarias where worker_id = new.id;
  return new;
end;
$$;

create trigger service_workers_caixa
  after update of valor_diaria, dias_trabalhados on public.service_workers
  for each row execute function public.service_workers_sincroniza_caixa();

-- A view ganha os custos, então é recriada (colunas novas no meio de `s.*` não cabem em replace).
drop view public.obras_resumo;

create view public.obras_resumo
with (security_invoker = true) as
select
  s.*,
  coalesce(t.recebido, 0)::numeric(12, 2) as valor_recebido,
  greatest(s.valor_total - coalesce(t.recebido, 0), 0)::numeric(12, 2) as saldo,
  coalesce(w.total, 0)::numeric(12, 2) as custo_diarias,
  coalesce(e.total, 0)::numeric(12, 2) as custo_insumos
from public.services s
left join lateral (
  select sum(valor) as recebido
  from public.transactions
  where service_id = s.id and tipo = 'entrada'
) t on true
left join lateral (
  select sum(total_diarias) as total from public.service_workers where service_id = s.id
) w on true
left join lateral (
  select sum(valor) as total from public.service_expenses where service_id = s.id
) e on true;

revoke all on public.obras_resumo from anon, authenticated;
grant select on public.obras_resumo to authenticated;

-- Marca ou desmarca a diária como paga. Pagar lança a saída no caixa (sempre); desmarcar remove.
create function public.marcar_diaria_paga(p_worker_id bigint, p_pago boolean)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_worker public.service_workers;
  v_obra public.services;
  v_nome text;
begin
  if not public.is_admin() then
    raise exception 'acesso negado' using errcode = '42501';
  end if;

  select * into v_worker from public.service_workers where id = p_worker_id for update;
  if not found then
    raise exception 'alocação não encontrada' using errcode = 'P0002';
  end if;
  select * into v_obra from public.services where id = v_worker.service_id;
  select nome into v_nome from public.employees where id = v_worker.employee_id;

  if p_pago then
    update public.service_workers set pago = true, pago_em = current_date where id = p_worker_id;
    insert into public.transactions
      (tipo, categoria, descricao, valor, client_id, service_id, worker_id)
    values ('saida', 'Diárias', 'Diária: ' || v_nome, v_worker.total_diarias,
            v_obra.client_id, v_obra.id, p_worker_id)
    on conflict (worker_id) where worker_id is not null
    do update set valor = excluded.valor;
  else
    update public.service_workers set pago = false, pago_em = null where id = p_worker_id;
    delete from public.transactions where worker_id = p_worker_id;
  end if;
end;
$$;

-- Cria (p_insumo_id nulo) ou atualiza o insumo e mantém o lançamento de saída conforme a opção.
create function public.salvar_insumo(
  p_obra_id bigint,
  p_insumo_id bigint,
  p_categoria text,
  p_descricao text,
  p_valor numeric,
  p_data date,
  p_lancar_no_caixa boolean
)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_obra public.services;
  v_id bigint;
begin
  if not public.is_admin() then
    raise exception 'acesso negado' using errcode = '42501';
  end if;

  select * into v_obra from public.services where id = p_obra_id for update;
  if not found then
    raise exception 'obra não encontrada' using errcode = 'P0002';
  end if;

  if p_insumo_id is null then
    insert into public.service_expenses (service_id, categoria, descricao, valor, data)
    values (p_obra_id, p_categoria, p_descricao, p_valor, coalesce(p_data, current_date))
    returning id into v_id;
  else
    update public.service_expenses
    set categoria = p_categoria, descricao = p_descricao, valor = p_valor,
        data = coalesce(p_data, data)
    where id = p_insumo_id and service_id = p_obra_id
    returning id into v_id;
    if v_id is null then
      raise exception 'insumo não encontrado' using errcode = 'P0002';
    end if;
  end if;

  if p_lancar_no_caixa then
    insert into public.transactions
      (tipo, categoria, descricao, valor, data, client_id, service_id, expense_id)
    values ('saida', 'Insumos & Materiais', p_descricao, p_valor, coalesce(p_data, current_date),
            v_obra.client_id, p_obra_id, v_id)
    on conflict (expense_id) where expense_id is not null
    do update set descricao = excluded.descricao, valor = excluded.valor, data = excluded.data;
  else
    delete from public.transactions where expense_id = v_id;
  end if;

  return v_id;
end;
$$;

revoke all on function public.marcar_diaria_paga(bigint, boolean) from public, anon;
revoke all on function public.salvar_insumo(bigint, bigint, text, text, numeric, date, boolean)
  from public, anon;
grant execute on function public.marcar_diaria_paga(bigint, boolean) to authenticated;
grant execute on function public.salvar_insumo(bigint, bigint, text, text, numeric, date, boolean)
  to authenticated;

-- Contratos: bucket privado, só o admin lê e escreve (acesso por URL assinada de curta duração).
-- Políticas restritas a este bucket para não afetar os de outros apps.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contratos', 'contratos', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
);

create policy dk_contratos_admin_le on storage.objects
  for select to authenticated
  using (bucket_id = 'contratos' and public.is_admin());

create policy dk_contratos_admin_envia on storage.objects
  for insert to authenticated
  with check (bucket_id = 'contratos' and public.is_admin());

create policy dk_contratos_admin_altera on storage.objects
  for update to authenticated
  using (bucket_id = 'contratos' and public.is_admin())
  with check (bucket_id = 'contratos' and public.is_admin());

create policy dk_contratos_admin_apaga on storage.objects
  for delete to authenticated
  using (bucket_id = 'contratos' and public.is_admin());
