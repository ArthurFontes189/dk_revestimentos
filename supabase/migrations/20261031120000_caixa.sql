-- E8: fluxo de caixa. Categorias fixas e proteção dos lançamentos que nascem de obra, diária e insumo.
-- Sem mudança de privilégios: as tabelas, políticas e grants são os da E6 e da E7.

-- Categorias fixas (a mesma lista vive em @dk/core). Entrada de obra e recebimento só existem
-- ligados a uma obra; a entrada manual usa "Outras entradas".
alter table public.transactions
  add constraint transactions_categoria_valida check (
    (tipo = 'entrada' and (
      (categoria in ('Entrada da obra', 'Recebimento') and service_id is not null)
      or categoria = 'Outras entradas'
    ))
    or (tipo = 'saida' and categoria in (
      'Madeiras & Insumos', 'Vernizes', 'Lixas & Parafusos', 'Frete & Transporte',
      'Manutenção & Ferramentas', 'Custos Oficina', 'Outras saídas',
      'Diárias', 'Insumos & Materiais'
    ))
  );

-- Quem pode mexer nos lançamentos automáticos: só as funções da obra e a exclusão da própria
-- diária, insumo ou obra. Elas ligam a variável `dk.caixa_interno` na transação; o painel de caixa
-- (PostgREST, uma requisição = uma transação) nunca a liga.
create function public.caixa_liberar_na_exclusao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform set_config('dk.caixa_interno', 'on', true);
  return old;
end;
$$;

create trigger services_libera_caixa
  before delete on public.services
  for each row execute function public.caixa_liberar_na_exclusao();
create trigger service_workers_libera_caixa
  before delete on public.service_workers
  for each row execute function public.caixa_liberar_na_exclusao();
create trigger service_expenses_libera_caixa
  before delete on public.service_expenses
  for each row execute function public.caixa_liberar_na_exclusao();

-- Bloqueia no banco o que o painel também esconde:
--  - alterar ou excluir saída de diária e de insumo (apagar deixaria a diária "paga" sem saída);
--  - editar uma entrada de obra (o ajuste é feito na obra, que respeita o valor total);
--  - religar um lançamento a outra obra, diária ou insumo.
-- Os triggers rodam com os privilégios de quem altera, então não precisam de grant.
-- Excluir uma entrada de obra continua permitido: o recebido da obra é a soma do caixa.
create function public.transactions_protege_vinculados()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_interno boolean := coalesce(current_setting('dk.caixa_interno', true), '') = 'on';
begin
  if v_interno then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if old.worker_id is not null or old.expense_id is not null then
    raise exception 'lançamento automático: altere pela obra' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' then
    if old.service_id is not null and old.tipo = 'entrada' then
      raise exception 'entrada de obra: altere pela obra' using errcode = '42501';
    end if;
    if (new.service_id, new.worker_id, new.expense_id)
         is distinct from (old.service_id, old.worker_id, old.expense_id) then
      raise exception 'não é possível religar o lançamento' using errcode = '42501';
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger transactions_protege
  before update or delete on public.transactions
  for each row execute function public.transactions_protege_vinculados();

-- As funções abaixo repetem as da E6/E7 (create or replace mantém os grants), só que ligando
-- a variável interna antes de mexer em lançamentos automáticos.
create or replace function public.service_workers_sincroniza_caixa()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform set_config('dk.caixa_interno', 'on', true);
  update public.transactions set valor = new.total_diarias where worker_id = new.id;
  return new;
end;
$$;

create or replace function public.definir_recebido(p_obra_id bigint, p_valor numeric)
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

  select coalesce(sum(valor), 0) into v_outras
  from public.transactions
  where service_id = p_obra_id and tipo = 'entrada' and categoria <> 'Entrada da obra';
  if p_valor + v_outras > v_obra.valor_total then
    raise exception 'o recebido não pode passar do valor total da obra';
  end if;

  perform set_config('dk.caixa_interno', 'on', true);

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

create or replace function public.marcar_diaria_paga(p_worker_id bigint, p_pago boolean)
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

  perform set_config('dk.caixa_interno', 'on', true);

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

create or replace function public.salvar_insumo(
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

  perform set_config('dk.caixa_interno', 'on', true);

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

-- Funções auxiliares não são chamadas pelo painel: sem acesso para anon e authenticated.
revoke all on function public.caixa_liberar_na_exclusao() from public, anon, authenticated;
revoke all on function public.transactions_protege_vinculados() from public, anon, authenticated;
