-- Testes do fluxo de caixa da E8 (pgTAP): categorias fixas e proteção dos lançamentos automáticos.
begin;
select plan(16);

insert into public.admins (user_id) values ('11111111-1111-1111-1111-111111111111');
insert into public.clients (nome, telefone) values ('Joana Lima', '61911112222');
insert into public.services (client_id, descricao, valor_total)
  select id, 'Painel ripado', 5000 from public.clients;
insert into public.employees (nome, diaria_padrao) values ('José Ribeiro', 250);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

insert into public.service_workers (service_id, employee_id, valor_diaria, dias_trabalhados)
  select s.id, e.id, 250, 4 from public.services s, public.employees e;

-- Categorias fixas
select throws_ok(
  $$ insert into public.transactions (tipo, categoria, valor) values ('saida', 'Churrasco', 50) $$,
  '23514', null, 'deve recusar saída com categoria fora da lista');
select throws_ok(
  $$ insert into public.transactions (tipo, categoria, valor) values ('entrada', 'Madeiras & Insumos', 50) $$,
  '23514', null, 'deve recusar entrada com categoria de saída');
select throws_ok(
  $$ insert into public.transactions (tipo, categoria, valor) values ('entrada', 'Entrada da obra', 50) $$,
  '23514', null, 'deve recusar entrada de obra sem obra ligada');

-- Lançamento manual: livre para criar, editar e excluir
select lives_ok(
  $$ insert into public.transactions (tipo, categoria, descricao, valor)
     values ('saida', 'Custos Oficina', 'Conta de luz', 300) $$,
  'deve criar saída manual');
select lives_ok(
  $$ update public.transactions set valor = 350 where descricao = 'Conta de luz' $$,
  'deve editar saída manual');
select lives_ok(
  $$ delete from public.transactions where descricao = 'Conta de luz' $$,
  'deve excluir saída manual');

-- Entrada de obra: editar é barrado, excluir reflete na obra
select public.definir_recebido((select id from public.services), 500);
select set_config('dk.caixa_interno', 'off', true);
select throws_ok(
  $$ update public.transactions set valor = 4000 where categoria = 'Entrada da obra' $$,
  '42501', 'entrada de obra: altere pela obra', 'deve barrar a edição direta da entrada de obra');
select lives_ok(
  $$ delete from public.transactions where categoria = 'Entrada da obra' $$,
  'deve permitir excluir a entrada de obra pelo caixa');
select is((select valor_recebido from public.obras_resumo), 0::numeric,
  'deve refletir na obra a exclusão da entrada pelo caixa');

-- Diária paga: somente pela obra
select public.marcar_diaria_paga((select id from public.service_workers), true);
select set_config('dk.caixa_interno', 'off', true);
select throws_ok(
  $$ delete from public.transactions where categoria = 'Diárias' $$,
  '42501', 'lançamento automático: altere pela obra', 'deve barrar a exclusão direta da saída de diária');
select throws_ok(
  $$ update public.transactions set valor = 1 where categoria = 'Diárias' $$,
  '42501', 'lançamento automático: altere pela obra', 'deve barrar a edição direta da saída de diária');

-- Insumo lançado: somente pela obra; excluir o insumo leva o lançamento
select public.salvar_insumo((select id from public.services), null, 'Ferragens', 'Dobradiças', 80, null, true);
select set_config('dk.caixa_interno', 'off', true);
select throws_ok(
  $$ delete from public.transactions where categoria = 'Insumos & Materiais' $$,
  '42501', 'lançamento automático: altere pela obra', 'deve barrar a exclusão direta da saída de insumo');
select lives_ok($$ delete from public.service_expenses $$,
  'deve excluir o insumo pela obra');
select is((select count(*) from public.transactions where categoria = 'Insumos & Materiais')::int, 0,
  'deve remover a saída do caixa quando o insumo é excluído');

-- Desmarcar a diária continua funcionando com a proteção ligada
select set_config('dk.caixa_interno', 'off', true);
select lives_ok(
  $$ select public.marcar_diaria_paga((select id from public.service_workers), false) $$,
  'deve desmarcar a diária pela obra mesmo com a proteção ligada');

-- Excluir a obra leva os lançamentos automáticos
select public.marcar_diaria_paga((select id from public.service_workers), true);
select set_config('dk.caixa_interno', 'off', true);
delete from public.services;
select is((select count(*) from public.transactions)::int, 0,
  'deve apagar os lançamentos automáticos quando a obra é excluída');

select * from finish();
rollback;
