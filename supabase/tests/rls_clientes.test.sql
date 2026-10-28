-- Testes de `clients` e da função `converter_lead` (pgTAP). Rodam com `supabase test db`.
begin;
select plan(20);

insert into public.admins (user_id) values ('11111111-1111-1111-1111-111111111111');

-- Três leads: A e B têm o mesmo telefone (B com DDI 55); C é outra pessoa.
insert into public.leads (nome, telefone, tipo_servico) values
  ('Maria Souza', '61999991234', 'Marcenaria Sob Medida'),
  ('Maria S.', '5561999991234', 'Ambientes Externos'),
  ('Carla Dias', '61977776666', 'Painéis & Revestimentos');

-- Visitante anônimo
set local role anon;

select throws_ok(
  $$ select * from public.clients $$,
  '42501',
  null,
  'deve negar a leitura de clientes quando o visitante é anônimo'
);

select throws_ok(
  $$ insert into public.clients (nome, telefone) values ('Invasor', '61900000000') $$,
  '42501',
  null,
  'deve negar a criação de cliente quando o visitante é anônimo'
);

select throws_ok(
  $$ select * from public.converter_lead(1) $$,
  '42501',
  null,
  'deve negar a conversão de lead quando o visitante é anônimo'
);

reset role;

-- Usuário logado que NÃO é admin
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

select is(
  (select count(*) from public.clients)::int,
  0,
  'deve ocultar os clientes quando o usuário logado não é admin'
);

select throws_ok(
  $$ insert into public.clients (nome, telefone) values ('Invasor', '61900000000') $$,
  '42501',
  null,
  'deve negar a criação de cliente quando o usuário logado não é admin'
);

select throws_ok(
  $$ select * from public.converter_lead((select min(id) from public.leads)) $$,
  '42501',
  'acesso negado',
  'deve negar a conversão de lead quando o usuário logado não é admin'
);

reset role;

-- Admin
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select is(
  (select cliente_novo from public.converter_lead((select id from public.leads where nome = 'Maria Souza'))),
  true,
  'deve criar o cliente quando converte um lead com telefone novo'
);

select is(
  (select status::text from public.leads where nome = 'Maria Souza'),
  'Fechado',
  'deve fechar o lead quando a conversão termina'
);

select is(
  (select telefone from public.clients where nome = 'Maria Souza'),
  '61999991234',
  'deve gravar o telefone sem DDI quando cria o cliente'
);

select is(
  (select lead_id from public.clients where nome = 'Maria Souza'),
  (select id from public.leads where nome = 'Maria Souza'),
  'deve guardar o lead de origem quando cria o cliente'
);

select matches(
  (select codigo from public.clients where nome = 'Maria Souza'),
  '^CLI-[0-9]{4,}$',
  'deve gerar o código no formato CLI-NNNN quando cria o cliente'
);

select is(
  (select cliente_novo from public.converter_lead((select id from public.leads where nome = 'Maria S.'))),
  false,
  'deve reaproveitar o cliente quando o telefone já existe (mesmo com DDI 55)'
);

select is(
  (select count(*) from public.clients)::int,
  1,
  'deve manter um só cliente quando dois leads têm o mesmo telefone'
);

select throws_ok(
  $$ select * from public.converter_lead((select id from public.leads where nome = 'Maria Souza')) $$,
  'P0001',
  'lead já convertido',
  'deve recusar quando o lead já foi convertido'
);

select throws_ok(
  $$ select * from public.converter_lead(-1) $$,
  'P0002',
  'lead não encontrado',
  'deve recusar quando o lead não existe'
);

select lives_ok(
  $$ select * from public.converter_lead((select id from public.leads where nome = 'Carla Dias')) $$,
  'deve converter quando o lead é de outra pessoa'
);

select isnt(
  (select codigo from public.clients where nome = 'Carla Dias'),
  (select codigo from public.clients where nome = 'Maria Souza'),
  'deve gerar códigos diferentes quando cria dois clientes'
);

-- Código nunca reaproveitado: guarda o da Carla, exclui, cria outro cliente.
select set_config('dk.codigo_carla', (select codigo from public.clients where nome = 'Carla Dias'), true);
delete from public.clients where nome = 'Carla Dias';
insert into public.clients (nome, telefone) values ('Pedro Lima', '61966665555');

select isnt(
  (select codigo from public.clients where nome = 'Pedro Lima'),
  current_setting('dk.codigo_carla'),
  'deve gerar um código novo quando um cliente foi excluído antes'
);

select throws_ok(
  $$ insert into public.clients (nome, telefone) values ('Outra Maria', '61999991234') $$,
  '23505',
  null,
  'deve rejeitar quando o telefone já pertence a outro cliente'
);

select throws_ok(
  $$ insert into public.clients (nome, telefone, cpf) values ('CPF Torto', '61955554444', 'abc') $$,
  '23514',
  null,
  'deve rejeitar quando o CPF não tem 11 dígitos'
);

select * from finish();
rollback;
