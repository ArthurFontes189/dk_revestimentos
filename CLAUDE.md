# CLAUDE.md

> Memória do projeto. Carregada em TODA sessão — mantenha curta (< 200 linhas).
> Só coloque aqui o que o Claude erraria sem saber. O resto vai em `.claude/rules/` ou em skills.

## Projeto

- **Nome:** DK Revestimentos v2
- **O que é:** site público (captação de leads para anúncios no Instagram/Facebook) e painel admin (leads, clientes, obras, equipe, caixa, portfólio, depoimentos) de uma marcenaria/revestimentos sob medida. Projeto de um cliente.
- **Spec:** `docs/SPEC.md` · **Plano atual:** `docs/PLANO.md` · **Arquitetura:** `docs/ARQUITETURA.md` · **Decisões:** `docs/decisoes/`
- A v1 está em `legado/` (**somente leitura**, referência; o `settings.json` bloqueia edição). Da v1 só se reaproveitam imagens, vídeos e regras de negócio (ver `docs/DIAGNOSTICO-V1.md`).

## Stack

- Linguagem/Runtime: TypeScript estrito + Node 24 (mínimo 22.23.4, exigência do Astro; o CI usa 24)
- Site público: Astro 5+ (ilhas React só onde há interação) · Painel: React + Vite em `/admin`
- Estilo: Tailwind v4 com tokens em `packages/ui/src/tokens.css`
- Backend: Supabase **novo** (Postgres + Auth de 1 usuário + Storage + Edge Functions). Nada do projeto da v1.
- Testes: Vitest (regras) · pgTAP (RLS, roda no CI) · Playwright (fluxos nas 4 larguras 360/768/1280/1920, Supabase simulado)
- Hospedagem: GitHub Pages (só estático) por enquanto; migrar para Cloudflare Pages antes de anúncios pagos
- Gerenciador de pacotes: pnpm ← use SEMPRE este, nunca npm/yarn

## Comandos

```bash
pnpm install        # instalar dependências
pnpm dev:site       # site em http://localhost:4321
pnpm dev:admin      # painel em http://localhost:5174/admin/
pnpm test           # testes unitários (Vitest)
pnpm lint           # ESLint
pnpm format:check   # Prettier (use `pnpm format` para corrigir)
pnpm typecheck      # tsc + astro check
pnpm build          # build dos dois apps + junta em dist/ (site na raiz, painel em /admin)
pnpm build:e2e      # build de teste (URL do Supabase FALSA) em dist/
pnpm test:e2e       # Playwright contra o dist/ (rode `build:e2e` antes)
```

Antes de dizer que terminou, rode `format:check`, `lint`, `typecheck`, `test`, `build` e, se mexeu em tela ou fluxo, `build:e2e` + `test:e2e`.

## Estrutura

```
apps/site/       Astro: site público e landing pages
apps/admin/      React + Vite: painel (rota por hash, ex.: /admin/#/leads)
packages/core/   regras de negócio puras e testadas (DRE, caixa, WhatsApp, schemas Zod)
packages/ui/     tokens de design compartilhados
supabase/        migrations (única fonte do schema), seed, functions, testes de RLS
scripts/         montar-dist.mjs (junta os builds) e utilitários de uso único
docs/            SPEC, PLANO, ARQUITETURA, DIAGNOSTICO-V1, decisoes/
legado/          v1 (somente leitura, fora do git da v2)
```

## Fluxo de trabalho (obrigatório)

1. **Explorar** — leia os arquivos relevantes antes de mudar qualquer coisa.
2. **Planejar** — para tarefas com mais de ~3 arquivos, escreva o plano em `docs/PLANO.md` e espere aprovação.
3. **Implementar** — em passos pequenos; um passo = uma mudança testável.
4. **Verificar** — rode a lista de comandos acima. Sem evidência, não está pronto.
5. **Commitar** — commits pequenos com Conventional Commits (use a skill `/commit`).

## Regras inegociáveis

- Nunca leia, edite ou imprima `.env`, chaves ou segredos. No front só a chave **publishable** do Supabase, via variável de ambiente; **nunca** `service_role`.
- Nunca faça `git push --force` nem reescreva histórico de `main`.
- Não adicione dependências novas sem perguntar (a stack do ADR 0001 já está aprovada).
- Não desative testes nem lint para "fazer passar".
- Não aplique nada em projeto Supabase real (`db push`, `link`, deploy de functions) sem autorização explícita.
- Toda tabela nasce com RLS e política mínima; sem `GRANT` amplo ao `anon`. RLS tem teste automatizado.
- Nada de `innerHTML` com dado de usuário; escape sempre.
- Se algo for ambíguo, pergunte em vez de supor.

## Armadilhas conhecidas

- **Dinheiro:** calcule em centavos inteiros (`paraCentavos`/`deCentavos` em `@dk/core`), nunca some `number` decimal direto.
- **Caixa:** `tipo` é `'entrada' | 'saida'`; "total pago" soma só entradas (a v1 somava saídas também).
- **WhatsApp:** use `montarLinkWhatsApp` (normaliza o DDI 55 e lança erro se o número faltar). O número real e o domínio ainda são fictícios, vêm de variáveis de ambiente.
- **TypeScript:** mantenha `typescript@6`. A versão 7 quebra o `typescript-eslint` (o lint não roda).
- **GitHub Pages:** sem rewrites, então o painel usa rota por hash. `BASE_PATH` termina com `/` (`/` com domínio próprio, `/nome-do-repo/` sem).
- **Windows:** o atalho global `pnpm.cmd` desta máquina está quebrado no `cmd`/PowerShell. Rode `pnpm` pelo Git Bash. No Git Bash, um valor como `BASE_PATH=/x/` é convertido em caminho do Windows; defina-o via script Node ou PowerShell.
- **ffmpeg:** instalado via winget (`Gyan.FFmpeg`), mas o PATH só vale em shell novo. Até lá, use o caminho completo em `%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg_*\ffmpeg-*\bin\ffmpeg.exe`.
- **Testes e2e:** o Supabase é simulado por `page.route` (`e2e/apoio.ts`). O `build:e2e` usa `https://e2e.supabase.co`; nunca aponte os testes para o projeto real (eles criariam e apagariam leads de verdade).
- **Hooks:** o hook bloqueia editar `.env*` (exceto `.env.example`), lockfiles e `.git/`. O `rm -rf` é negado pelas permissões.
- **`corbina/`:** é um worktree git de outra branch, alheio a este projeto. Não mexa; está no `.gitignore`.
- **Supabase gratuito** pausa após 1 semana sem uso e não tem backup. Produção exige plano Pro.
- **Projeto Supabase COMPARTILHADO** (`kkclcjejrvwxdlxknlbi`) com outro app (tabelas `notebooks`, `sources`, `chunks`, `profiles` e bucket `sources`, com dados). Nunca altere esses objetos, nunca mude `default privileges` do schema `public` e nunca desligue o cadastro público (quebraria o outro app). O login (`auth.users`) é o mesmo; a DK protege os dados pela tabela `admins`.
- **Migrations aplicadas à mão:** a `20261027120000_base` foi colada no SQL Editor e não consta em `supabase_migrations`. Antes do primeiro `supabase db push`, rode `supabase migration repair --status applied 20261027120000`, senão o push tenta recriar tudo e falha.
- **Recuperação de senha:** o e-mail volta para `<SITE_URL><BASE_PATH>admin/`; essa URL precisa estar em Authentication → URL Configuration → Redirect URLs.
