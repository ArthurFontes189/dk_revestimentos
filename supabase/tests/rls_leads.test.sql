-- Testes de RLS das tabelas `leads` e `admins` (pgTAP). Rodam com `supabase test db`.
begin;
select plan(14);

-- Dois usuários simulados pelo JWT (auth.uid() lê o `sub`); só o primeiro é admin.
insert into public.admins (user_id) values ('11111111-1111-1111-1111-111111111111');

-- Visitante anônimo
set local role anon;

select lives_ok(
  $$ insert into public.leads (nome, telefone, tipo_servico)
     values ('Maria Souza', '61999991234', 'Marcenaria Sob Medida') $$,
  'deve permitir criar lead quando o visitante é anônimo'
);

select throws_ok(
  $$ select * from public.leads $$,
  '42501',
  null,
  'deve negar a leitura de leads quando o visitante é anônimo'
);

select throws_ok(
  $$ insert into public.leads (nome, telefone, tipo_servico, status)
     values ('Maria Souza', '61999991234', 'Marcenaria Sob Medida', 'Fechado') $$,
  '42501',
  null,
  'deve negar quando o anônimo tenta escolher o status do lead'
);

select throws_ok(
  $$ insert into public.leads (nome, telefone, tipo_servico)
     values ('Maria Souza', 'abc', 'Marcenaria Sob Medida') $$,
  '23514',
  null,
  'deve rejeitar telefone inválido quando o anônimo cria lead'
);

select throws_ok(
  $$ update public.leads set status = 'Fechado' $$,
  '42501',
  null,
  'deve negar a atualização de leads quando o visitante é anônimo'
);

select throws_ok(
  $$ delete from public.leads $$,
  '42501',
  null,
  'deve negar a exclusão de leads quando o visitante é anônimo'
);

select throws_ok(
  $$ select * from public.admins $$,
  '42501',
  null,
  'deve negar a leitura de admins quando o visitante é anônimo'
);

reset role;

-- Usuário logado que NÃO é admin
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

select is(
  (select count(*) from public.leads)::int,
  0,
  'deve ocultar os leads quando o usuário logado não é admin'
);

select throws_ok(
  $$ insert into public.leads (nome, telefone, tipo_servico)
     values ('Ana Lima', '61988887777', 'Ambientes Externos') $$,
  '42501',
  null,
  'deve negar a criação de lead quando o usuário logado não é admin'
);

select is(
  (select public.is_admin()),
  false,
  'deve responder falso em is_admin quando o usuário não está na lista'
);

reset role;

-- Admin
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select is(
  (select count(*) from public.leads)::int,
  1,
  'deve listar os leads quando o usuário é admin'
);

select lives_ok(
  $$ update public.leads set status = 'Em Negociação' $$,
  'deve permitir mudar o status quando o usuário é admin'
);

select is(
  (select status::text from public.leads limit 1),
  'Em Negociação',
  'deve persistir o novo status quando o admin atualiza o lead'
);

select lives_ok(
  $$ delete from public.leads $$,
  'deve permitir excluir leads quando o usuário é admin'
);

select * from finish();
rollback;
