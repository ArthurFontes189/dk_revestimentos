-- Testes de `services`, `transactions`, `obras_resumo` e das RPCs da E6 (pgTAP).
begin;
select plan(18);

insert into public.admins (user_id) values ('11111111-1111-1111-1111-111111111111');

insert into public.leads (nome, telefone, tipo_servico) values
  ('Maria Souza', '61999991234', 'Marcenaria Sob Medida'),
  ('Carla Dias', '61977776666', 'Painéis & Revestimentos');
insert into public.clients (nome, telefone) values ('Joana Lima', '61911112222');
insert into public.services (client_id, descricao, valor_total)
  select id, 'Painel ripado', 1000 from public.clients where telefone = '61911112222';

-- Visitante anônimo
set local role anon;
select throws_ok($$ select * from public.services $$, '42501', null,
  'deve negar a leitura de obras quando o visitante é anônimo');
select throws_ok($$ select * from public.transactions $$, '42501', null,
  'deve negar a leitura do caixa quando o visitante é anônimo');
select throws_ok($$ select * from public.obras_resumo $$, '42501', null,
  'deve negar a leitura do resumo quando o visitante é anônimo');
reset role;

-- Logado, mas não admin
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select is((select count(*) from public.services)::int, 0,
  'deve ocultar as obras quando o usuário logado não é admin');
select throws_ok(
  $$ select public.definir_recebido((select min(id) from public.services), 100) $$,
  '42501', 'acesso negado',
  'deve negar definir_recebido quando o usuário não é admin');
select throws_ok(
  $$ select public.registrar_recebimento((select min(id) from public.services), 100) $$,
  '42501', 'acesso negado',
  'deve negar registrar_recebimento quando o usuário não é admin');
reset role;

-- Admin
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select lives_ok(
  $$ select public.definir_recebido((select min(id) from public.services), 300) $$,
  'deve definir o recebido quando o valor cabe no total');
select lives_ok(
  $$ select public.definir_recebido((select min(id) from public.services), 400) $$,
  'deve ajustar o mesmo lançamento quando o recebido é redefinido');
select is(
  (select count(*) from public.transactions where categoria = 'Entrada da obra')::int, 1,
  'deve manter um único lançamento de entrada da obra');
select is(
  (select valor_recebido from public.obras_resumo limit 1), 400::numeric,
  'deve refletir na obra o valor definido no caixa');

select lives_ok(
  $$ select public.registrar_recebimento((select min(id) from public.services), 600) $$,
  'deve quitar o saldo quando o recebimento fecha o valor total');
select is(
  (select saldo from public.obras_resumo limit 1), 0::numeric,
  'deve zerar o saldo quando a obra está quitada');
select throws_ok(
  $$ select public.registrar_recebimento((select min(id) from public.services), 1) $$,
  'P0001', 'o recebido não pode passar do valor total da obra',
  'deve recusar recebimento acima do valor total');

-- Conversão com obra: cliente, obra e entrada numa transação
select is(
  (select obra_id is not null from public.converter_lead(
    (select id from public.leads where nome = 'Maria Souza'),
    '{"descricao":"Cozinha planejada","valor_total":5000,"valor_entrada":1500}'::jsonb)),
  true, 'deve criar a obra quando a conversão recebe os dados dela');
select is(
  (select valor_recebido from public.obras_resumo where descricao = 'Cozinha planejada'),
  1500::numeric, 'deve lançar a entrada no caixa quando a conversão traz entrada');
select throws_ok(
  $$ select * from public.converter_lead(
    (select id from public.leads where nome = 'Carla Dias'),
    '{"descricao":"Closet","valor_total":100,"valor_entrada":200}'::jsonb) $$,
  'P0001', 'a entrada não pode passar do valor total da obra',
  'deve recusar entrada acima do valor total na conversão');

-- Conclusão preenchida pelo banco
update public.services set status = 'Concluído' where descricao = 'Painel ripado';
select isnt((select concluida_em from public.services where descricao = 'Painel ripado'), null,
  'deve preencher concluida_em quando a obra vira Concluído');

-- Excluir a obra apaga os lançamentos ligados
delete from public.services where descricao = 'Painel ripado';
select is((select count(*) from public.transactions where descricao = 'Painel ripado')::int, 0,
  'deve apagar os lançamentos quando a obra é excluída');

select * from finish();
rollback;
