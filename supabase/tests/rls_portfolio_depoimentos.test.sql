-- Testes de RLS e Storage do portfólio e dos depoimentos (pgTAP). Rodam com `supabase test db`.
begin;
select plan(23);

insert into public.admins (user_id) values ('11111111-1111-1111-1111-111111111111');

-- Dados criados pelo dono do banco (sem passar por RLS)
insert into public.portfolio_items (titulo, categoria, tipo, imagem_base, larguras, largura_original, altura_original, publicado)
values
  ('Deck publicado', 'ÁREAS EXTERNAS', 'foto', 'a/abc', '{480,960}', 1280, 960, true),
  ('Rascunho oculto', 'MARCENARIA', 'foto', 'b/def', '{480}', 480, 640, false);

insert into public.testimonials (imagem_base, larguras, largura_original, altura_original, visivel)
values
  ('d/111', '{480}', 480, 900, true),
  ('d/222', '{480}', 480, 900, false);

-- Visitante anônimo
set local role anon;

select is((select count(*) from public.portfolio_items)::int, 1,
  'deve listar só os itens publicados quando o visitante é anônimo');

select is((select count(*) from public.testimonials)::int, 1,
  'deve listar só os depoimentos visíveis quando o visitante é anônimo');

select throws_ok(
  $$ insert into public.portfolio_items (titulo, categoria, tipo, imagem_base, larguras, largura_original, altura_original)
     values ('Invasor', 'MARCENARIA', 'foto', 'x/y', '{480}', 480, 480) $$,
  '42501', null, 'deve negar a criação de item do portfólio quando o visitante é anônimo');

select throws_ok($$ update public.portfolio_items set titulo = 'Hackeado' $$,
  '42501', null, 'deve negar a edição do portfólio quando o visitante é anônimo');

select throws_ok($$ delete from public.testimonials $$,
  '42501', null, 'deve negar a exclusão de depoimentos quando o visitante é anônimo');

reset role;

-- Usuário logado que NÃO é admin: lê só o público e não escreve
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

select is((select count(*) from public.portfolio_items)::int, 1,
  'deve listar só os publicados quando o usuário logado não é admin');

select throws_ok(
  $$ insert into public.testimonials (imagem_base, larguras, largura_original, altura_original)
     values ('z/z', '{480}', 480, 480) $$,
  '42501', null, 'deve negar a criação de depoimento quando o usuário logado não é admin');

reset role;

-- Admin
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select is((select count(*) from public.portfolio_items)::int, 2,
  'deve listar publicados e rascunhos quando o usuário é admin');

select is((select count(*) from public.testimonials)::int, 2,
  'deve listar depoimentos visíveis e ocultos quando o usuário é admin');

select lives_ok(
  $$ insert into public.portfolio_items (titulo, categoria, tipo, imagem_base, larguras, largura_original, altura_original, ordem)
     values ('Novo item', 'MÓVEIS SOB MEDIDA', 'foto', 'n/novo', '{480,960,1920}', 2400, 1600, 5) $$,
  'deve permitir criar item quando o usuário é admin');

select lives_ok(
  $$ insert into public.portfolio_items (titulo, categoria, tipo, imagem_base, larguras, largura_original, altura_original, video_path)
     values ('Vídeo novo', 'ÁREAS EXTERNAS', 'video', 'v/video', '{480}', 576, 1024, 'v/video.mp4') $$,
  'deve permitir criar vídeo quando há o caminho do arquivo');

select throws_ok(
  $$ insert into public.portfolio_items (titulo, categoria, tipo, imagem_base, larguras, largura_original, altura_original)
     values ('Vídeo sem arquivo', 'ÁREAS EXTERNAS', 'video', 'v/sem', '{480}', 576, 1024) $$,
  '23514', null, 'deve rejeitar vídeo sem arquivo quando o admin esquece o caminho');

select throws_ok(
  $$ insert into public.portfolio_items (titulo, categoria, tipo, imagem_base, larguras, largura_original, altura_original)
     values ('Sem larguras', 'MARCENARIA', 'foto', 'a/b', '{}', 480, 480) $$,
  '23514', null, 'deve rejeitar item sem nenhuma variante de imagem');

select lives_ok(
  $$ update public.portfolio_items set publicado = true, destaque = true where titulo = 'Rascunho oculto' $$,
  'deve permitir publicar e destacar um rascunho quando o usuário é admin');

select is((select count(*) from public.portfolio_items where publicado)::int, 4,
  'deve contar o rascunho como publicado depois de publicar');

select lives_ok($$ update public.testimonials set visivel = true $$,
  'deve permitir exibir depoimentos ocultos quando o usuário é admin');

select lives_ok($$ delete from public.testimonials where imagem_base = 'd/222' $$,
  'deve permitir excluir depoimento quando o usuário é admin');

reset role;

-- Storage: buckets e políticas (checados pelo catálogo, sem depender dos gatilhos internos do Storage)
select is(
  (select public from storage.buckets where id = 'portfolio'), true,
  'deve deixar o bucket portfolio público para leitura');

select is(
  (select file_size_limit from storage.buckets where id = 'portfolio'), 26214400::bigint,
  'deve limitar o bucket portfolio a 25 MB por arquivo');

select is(
  (select allowed_mime_types from storage.buckets where id = 'depoimentos'), array['image/webp'],
  'deve aceitar só imagem webp no bucket depoimentos');

select is(
  (select count(*)::int from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname like 'dk_midia_admin_%'),
  4, 'deve ter as 4 políticas de escrita e leitura do admin em storage.objects');

select is(
  (select count(*)::int from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname like 'dk_midia_admin_%'
      and 'anon' = any (roles)),
  0, 'não deve dar nenhuma política de storage ao papel anônimo');

select is(
  (select count(*)::int from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname like 'dk_midia_admin_%'
      and (coalesce(qual, '') || coalesce(with_check, '')) not like '%is_admin%'),
  0, 'deve exigir is_admin em todas as políticas de storage da DK');

select * from finish();
rollback;
