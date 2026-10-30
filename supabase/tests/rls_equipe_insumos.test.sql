-- Testes de equipe, diárias, insumos e do bucket `contratos` (pgTAP).
begin;
select plan(20);

insert into public.admins (user_id) values ('11111111-1111-1111-1111-111111111111');

insert into public.clients (nome, telefone) values ('Joana Lima', '61911112222');
insert into public.services (client_id, descricao, valor_total)
  select id, 'Painel ripado', 5000 from public.clients;
insert into public.employees (nome, diaria_padrao) values ('José Ribeiro', 250);

-- Visitante anônimo
set local role anon;
select throws_ok($$ select * from public.employees $$, '42501', null,
  'deve negar a leitura da equipe quando o visitante é anônimo');
select throws_ok($$ select * from public.service_workers $$, '42501', null,
  'deve negar a leitura das alocações quando o visitante é anônimo');
select throws_ok($$ select * from public.service_expenses $$, '42501', null,
  'deve negar a leitura dos insumos quando o visitante é anônimo');
reset role;

-- Logado, mas não admin
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select is((select count(*) from public.employees)::int, 0,
  'deve ocultar a equipe quando o usuário logado não é admin');
select throws_ok($$ select public.marcar_diaria_paga(1, true) $$, '42501', 'acesso negado',
  'deve negar marcar_diaria_paga quando o usuário não é admin');
select throws_ok(
  $$ select public.salvar_insumo(1, null, 'Ferragens', 'Dobradiças', 10, null, true) $$,
  '42501', 'acesso negado', 'deve negar salvar_insumo quando o usuário não é admin');
select is((select count(*) from storage.objects where bucket_id = 'contratos')::int, 0,
  'deve ocultar os contratos quando o usuário logado não é admin');
reset role;

-- Admin
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

insert into public.service_workers (service_id, employee_id, valor_diaria, dias_trabalhados)
  select s.id, e.id, 250, 4 from public.services s, public.employees e;

select is((select total_diarias from public.service_workers), 1000::numeric,
  'deve calcular o total da diária quando a alocação é criada');
select throws_ok(
  $$ insert into public.service_workers (service_id, employee_id, valor_diaria, dias_trabalhados)
     select s.id, e.id, 100, 1 from public.services s, public.employees e $$,
  '23505', null, 'deve recusar o mesmo funcionário duas vezes na mesma obra');
select throws_ok($$ delete from public.employees $$, '23503', null,
  'deve proteger o funcionário alocado contra exclusão');

select lives_ok($$ select public.marcar_diaria_paga((select id from public.service_workers), true) $$,
  'deve marcar a diária como paga');
select is(
  (select valor from public.transactions where tipo = 'saida' and categoria = 'Diárias'),
  1000::numeric, 'deve lançar a saída da diária no caixa quando ela é paga');

update public.service_workers set dias_trabalhados = 5;
select is(
  (select valor from public.transactions where categoria = 'Diárias'), 1250::numeric,
  'deve atualizar a saída do caixa quando os dias da diária paga mudam');

select public.marcar_diaria_paga((select id from public.service_workers), false);
select is((select count(*) from public.transactions where categoria = 'Diárias')::int, 0,
  'deve remover a saída do caixa quando a diária é desmarcada');

-- Insumo com lançamento no caixa
select lives_ok(
  $$ select public.salvar_insumo((select id from public.services), null, 'Ferragens',
       'Dobradiças 35 mm', 89.90, null, true) $$,
  'deve criar o insumo lançando no caixa');
select is(
  (select valor from public.transactions where categoria = 'Insumos & Materiais'), 89.90::numeric,
  'deve lançar a saída do insumo no caixa');
select public.salvar_insumo((select id from public.services), (select id from public.service_expenses),
  'Ferragens', 'Dobradiças 35 mm', 120, null, true);
select is(
  (select valor from public.transactions where categoria = 'Insumos & Materiais'), 120::numeric,
  'deve ajustar o lançamento quando o valor do insumo muda');
select is(
  (select custo_insumos from public.obras_resumo), 120::numeric,
  'deve somar o insumo no custo da obra');

delete from public.service_expenses;
select is((select count(*) from public.transactions where categoria = 'Insumos & Materiais')::int, 0,
  'deve remover o lançamento quando o insumo é excluído');

-- Excluir a obra leva a alocação junto
delete from public.services;
select is((select count(*) from public.service_workers)::int, 0,
  'deve apagar as alocações quando a obra é excluída');
reset role;

select * from finish();
rollback;
