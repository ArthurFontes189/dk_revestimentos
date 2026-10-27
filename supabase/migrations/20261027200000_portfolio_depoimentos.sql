-- E4: portfólio e depoimentos editáveis pelo painel (tabelas + Storage), com RLS desde o início.
-- Projeto compartilhado com outro app: só criamos objetos da DK, sem mexer nos privilégios padrão
-- e sem tocar em buckets/políticas de outros apps. Depende de `public.is_admin()` e `set_updated_at()`.

create type public.categoria_portfolio as enum (
  'MARCENARIA',
  'MÓVEIS SOB MEDIDA',
  'ÁREAS EXTERNAS',
  'MADEIRA & REVESTIMENTOS',
  'PROJETOS ESPECIAIS'
);

create type public.tipo_midia as enum ('foto', 'video');

-- Itens do portfólio. As mídias ficam no bucket `portfolio`; aqui só os caminhos.
-- Variantes de imagem: "<imagem_base>-<largura>.webp" para cada largura em `larguras`.
create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(titulo) between 2 and 120),
  descricao text not null default '' check (char_length(descricao) <= 600),
  categoria public.categoria_portfolio not null,
  tipo public.tipo_midia not null,
  imagem_base text not null check (char_length(imagem_base) between 3 and 200),
  larguras integer[] not null check (cardinality(larguras) between 1 and 6),
  largura_original integer not null check (largura_original > 0),
  altura_original integer not null check (altura_original > 0),
  -- miniatura minúscula (data URL) usada como placeholder enquanto a imagem carrega
  blur text check (char_length(blur) <= 2000),
  -- só para vídeos: caminho do arquivo MP4 dentro do bucket `portfolio`
  video_path text check (char_length(video_path) <= 200),
  destaque boolean not null default false,
  publicado boolean not null default true,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portfolio_video_tem_arquivo check (tipo = 'foto' or video_path is not null)
);

create index portfolio_items_ordem_idx on public.portfolio_items (ordem, created_at);

create trigger portfolio_items_set_updated_at
  before update on public.portfolio_items
  for each row execute function public.set_updated_at();

alter table public.portfolio_items enable row level security;
revoke all on public.portfolio_items from anon, authenticated;
grant select on public.portfolio_items to anon;
grant select, insert, update, delete on public.portfolio_items to authenticated;

-- Qualquer visitante lê só o que está publicado; o admin lê e altera tudo.
create policy portfolio_publico_le on public.portfolio_items
  for select to anon, authenticated
  using (publicado);

create policy portfolio_admin_tudo on public.portfolio_items
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Depoimentos: imagens de avaliações (normalmente prints de WhatsApp) enviadas pelo admin.
create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  imagem_base text not null check (char_length(imagem_base) between 3 and 200),
  larguras integer[] not null check (cardinality(larguras) between 1 and 6),
  largura_original integer not null check (largura_original > 0),
  altura_original integer not null check (altura_original > 0),
  blur text check (char_length(blur) <= 2000),
  nome text check (char_length(nome) <= 60),
  legenda text check (char_length(legenda) <= 120),
  ordem integer not null default 0,
  visivel boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index testimonials_ordem_idx on public.testimonials (ordem, created_at);

create trigger testimonials_set_updated_at
  before update on public.testimonials
  for each row execute function public.set_updated_at();

alter table public.testimonials enable row level security;
revoke all on public.testimonials from anon, authenticated;
grant select on public.testimonials to anon;
grant select, insert, update, delete on public.testimonials to authenticated;

create policy depoimentos_publico_le on public.testimonials
  for select to anon, authenticated
  using (visivel);

create policy depoimentos_admin_tudo on public.testimonials
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Storage: dois buckets públicos para leitura (URL pública), escrita só do admin.
-- Limites e tipos permitidos valem no servidor (o painel também valida antes de enviar).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('portfolio', 'portfolio', true, 26214400, array['image/webp', 'video/mp4']),
  ('depoimentos', 'depoimentos', true, 5242880, array['image/webp'])
on conflict (id) do nothing;

-- Políticas em storage.objects restritas aos buckets da DK (não afetam os de outros apps).
create policy dk_midia_admin_le on storage.objects
  for select to authenticated
  using (bucket_id in ('portfolio', 'depoimentos') and public.is_admin());

create policy dk_midia_admin_envia on storage.objects
  for insert to authenticated
  with check (bucket_id in ('portfolio', 'depoimentos') and public.is_admin());

create policy dk_midia_admin_altera on storage.objects
  for update to authenticated
  using (bucket_id in ('portfolio', 'depoimentos') and public.is_admin())
  with check (bucket_id in ('portfolio', 'depoimentos') and public.is_admin());

create policy dk_midia_admin_apaga on storage.objects
  for delete to authenticated
  using (bucket_id in ('portfolio', 'depoimentos') and public.is_admin());
