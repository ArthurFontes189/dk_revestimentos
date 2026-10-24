# DK Revestimentos v2

Site público de captação de leads e painel de gestão de uma marcenaria/revestimentos sob medida.
Reformulação da v1 (mantida em `legado/`, somente leitura) com stack moderna e design premium.

- **O que construir:** [`docs/SPEC.md`](docs/SPEC.md)
- **Estado e próximos passos:** [`docs/PLANO.md`](docs/PLANO.md)
- **Arquitetura e banco:** [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) · decisões em [`docs/decisoes/`](docs/decisoes/)
- **Diagnóstico da v1:** [`docs/DIAGNOSTICO-V1.md`](docs/DIAGNOSTICO-V1.md)

## Como rodar

Requisitos: Node 22+ e pnpm. No Windows, use o Git Bash (veja "Armadilhas" no `CLAUDE.md`).

```bash
pnpm install
cp .env.example .env     # preencha; valores de WhatsApp são fictícios por enquanto
pnpm dev:site            # http://localhost:4321
pnpm dev:admin           # http://localhost:5174/admin/
```

| Comando             | Para quê                                        |
| ------------------- | ----------------------------------------------- |
| `pnpm test`         | testes unitários (Vitest)                       |
| `pnpm lint`         | ESLint                                          |
| `pnpm format:check` | Prettier (`pnpm format` corrige)                |
| `pnpm typecheck`    | `tsc` e `astro check`                           |
| `pnpm build`        | gera `dist/` (site na raiz, painel em `/admin`) |

## Estrutura

```
apps/site/       Astro: site público
apps/admin/      React + Vite: painel
packages/core/   regras de negócio puras e testadas
packages/ui/     tokens de design
supabase/        migrations, seed, functions, testes de RLS
docs/            especificação, plano, arquitetura, decisões
```

## Deploy

GitHub Actions publica no GitHub Pages (`.github/workflows/deploy.yml`) a partir da `main`.
As variáveis públicas (`SITE_URL`, `BASE_PATH`, WhatsApp, Supabase) ficam em
Settings → Secrets and variables → Actions → **Variables**. Segredos nunca entram no repositório.

> O GitHub Pages serve como hospedagem de desenvolvimento/homologação. Antes de divulgar com
> anúncios, migrar para Cloudflare Pages (ver `docs/decisoes/0001-stack.md`).

## Fluxo com Claude Code

Skills: `/nova-feature`, `/corrigir-bug`, `/commit`. Subagentes: `revisor` e `pesquisador`.
Hooks protegem `.env`, chaves e lockfiles e formatam cada arquivo editado.
