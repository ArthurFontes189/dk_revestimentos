# 0001. Stack e hospedagem

- Status: **proposta** (aguardando confirmação do dono; ver "Premissa")
- Data: 2026-10-22

## Contexto

- Um desenvolvedor, projeto de cliente, orçamento mínimo.
- Site público precisa ser muito rápido (anúncios no Instagram/Facebook) e o painel precisa funcionar bem no celular **e** no computador.
- Banco, autenticação e arquivos no Supabase (projeto novo).
- Hospedagem inicial definida pelo dono: **GitHub Pages**, que serve **apenas arquivos estáticos**: sem servidor, sem rewrites, sem controle de cabeçalhos HTTP.

## Decisão

**Opção B: Astro (site público) + React/Vite (painel em `/admin`), monorepo, tudo estático.**

| Camada       | Escolha                                                                                 |
| ------------ | --------------------------------------------------------------------------------------- |
| Linguagem    | TypeScript estrito                                                                      |
| Site público | Astro 5, ilhas React só onde há interação (formulário, carrossel, lightbox)             |
| Painel       | React + Vite SPA, TanStack Router (histórico por hash) e TanStack Query                 |
| Estilo       | Tailwind v4, tokens de cor/tipografia compartilhados entre site e painel                |
| Backend      | Supabase: Postgres, Auth (1 usuário), Storage, Edge Functions                           |
| Validação    | Zod (mesmos schemas no site, no painel e na função)                                     |
| Testes       | Vitest (regras), pgTAP (RLS no banco), Playwright (fluxos e larguras 360/768/1280/1920) |
| Qualidade    | ESLint, Prettier, `tsc --noEmit`                                                        |
| Gerenciador  | pnpm (workspaces)                                                                       |
| PWA          | `vite-plugin-pwa` no painel; service worker leve no site                                |
| Deploy       | GitHub Actions → GitHub Pages                                                           |

**Premissa:** o dono escolheu hospedagem no GitHub Pages sem escolher A ou B explicitamente. A Opção A (Next.js) exigiria exportação estática e perderia justamente o que a justifica (rotas de servidor). Por isso assumi a B. Se preferir A, esta decisão é revista antes de qualquer código.

### Adaptações exigidas pelo GitHub Pages

- **Sem servidor próprio:** o envio do evento `Lead` ao Meta Conversions API roda numa **Supabase Edge Function**, que guarda o token da Meta como segredo. O navegador nunca vê o token.
- **Sem rewrites:** o painel usa rota por hash (`/admin/#/leads`), evitando erro 404 ao recarregar.
- **Endereço:** enquanto for `usuario.github.io/<repo>/`, o `base` do Astro e do Vite vem de variável de ambiente. Com domínio próprio, o `base` vira `/`.
- **Sem cabeçalhos de segurança:** CSP só via `<meta>`; sem HSTS configurável. Mitigação: sem `innerHTML` com dados, escape total e dependências com versão fixa.
- **Deploy por Actions** (o limite de 10 builds/hora não vale para workflow próprio). Os dois apps são montados em um único artefato: `site` na raiz, `admin` em `/admin`.
- **Repositório público** (Pages gratuito exige). Segredos nunca entram no repositório; só a chave pública do Supabase, que é pública por desenho e protegida por RLS.

## Alternativas consideradas

- **Next.js + Vercel Pro:** um app só e ecossistema maior, mas ~US$ 20/mês, mais JavaScript no site público e não aproveita hospedagem estática.
- **Sem framework (HTML/JS puro, como a v1):** é justamente o que o dono quer deixar para trás.

## Consequências

- ✅ Custo de hospedagem zero e site público com quase nenhum JavaScript.
- ✅ Mesmo build roda em Cloudflare Pages, Netlify ou Vercel sem mudar código: só trocar o workflow e o `base`.
- ⚠️ **Risco de termos de uso:** o GitHub Pages não admite sites cuja finalidade principal seja operar um negócio comercial ([limites e termos](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)). Um site institucional com anúncios é zona cinza. **Tratar o GitHub Pages como hospedagem de desenvolvimento e homologação** e migrar para Cloudflare Pages (gratuito) antes de divulgar com anúncios pagos.
- ⚠️ Dois apps no mesmo repositório exigem disciplina de pacotes compartilhados (`packages/ui`, `packages/core`).
- ⚠️ Painel é SPA: a segurança depende 100% do RLS, que tem teste automatizado obrigatório.
- ⚠️ Supabase gratuito pausa após 1 semana sem uso e não tem backup. Para produção, plano Pro (~US$ 25/mês).
- ⚠️ O Pages limita o site publicado a 1 GB e recomenda até ~100 GB/mês de banda. Por isso as mídias ficam no Storage do Supabase, não no repositório.
