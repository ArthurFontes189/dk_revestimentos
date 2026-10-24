# Arquitetura da v2

> Complementa `docs/decisoes/0001-stack.md`. Rascunho da Fase 3, para aprovação.

## Estrutura de pastas

```
apps/
  site/                 Astro: site público e landing pages
    src/{pages,layouts,components,islands,styles}
  admin/                React + Vite: painel em /admin
    src/{routes,features,components,lib}
      features/         leads, clientes, obras, equipe, caixa, portfolio, depoimentos
packages/
  ui/                   tokens (cores, tipografia, raios) e componentes compartilhados
  core/                 schemas Zod, tipos, regras de negócio puras e testáveis
                        (DRE da obra, saldo, formatadores BRL/CPF/telefone, link do WhatsApp)
  media/                pipeline de otimização no navegador (WebP, larguras, blur, poster de vídeo)
  db/                   tipos TypeScript gerados a partir do banco
supabase/
  config.toml
  migrations/           SQL versionado (única fonte do schema)
  seed.sql              15 projetos do portfólio, recriados como seed
  functions/meta-capi/  Edge Function (token da Meta como segredo)
  tests/                pgTAP: testes de RLS e das funções
scripts/
  importar-midias/      otimiza e envia as mídias de ./legado ao Storage (uso único)
.github/workflows/      ci.yml (lint, tipos, testes) e deploy.yml (Pages)
docs/                   SPEC, PLANO, DIAGNOSTICO-V1, ARQUITETURA, decisoes/
legado/                 v1, somente leitura, fora do build e fora do git da v2
```

`legado/` já é um repositório git próprio. Vai para o `.gitignore` da v2.

## Banco novo (Supabase), tudo por migrations

**Princípios:** projeto novo, nenhuma tabela criada à mão no painel do Supabase, RLS ligado em todas as tabelas desde a primeira migration, nenhum `GRANT` amplo ao `anon`.

**Tabelas (nomes finais definidos na implementação)**

| Tabela             | Notas                                                                                                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `leads`            | nome, telefone, bairro, tipo de serviço, **mensagem**, status (enum), origem (`utm_source`, `utm_medium`, `utm_campaign`, `fbclid`, página de entrada), `created_at timestamptz` |
| `clients`          | `codigo` único gerado por sequência no banco (`CLI-0001`), CPF, telefone, endereço, obs                                                                                          |
| `services` (obras) | FK `client_id` e `lead_id`, valores `numeric(12,2)`, status (enum), `data_entrega date`                                                                                          |
| `service_workers`  | alocação funcionário ↔ obra: FK `employee_id`, diária, dias, status de pagamento                                                                                                 |
| `service_expenses` | insumos da obra, categoria (enum), valor, vínculo opcional com a transação do caixa                                                                                              |
| `employees`        | cargo, PIX, diária padrão, status, caminho do contrato no Storage                                                                                                                |
| `transactions`     | tipo (enum), categoria unificada, valor, `data date`, vínculos opcionais (cliente, obra, insumo)                                                                                 |
| `portfolio_items`  | tipo, categoria (enum), título, subtítulo, descrição, caminhos das variantes no Storage, `destaque`, `ordem`, `publicado`                                                        |
| `testimonials`     | caminho da imagem, nome e projeto opcionais, `ordem`, `visivel`                                                                                                                  |

- **Enums/CHECK** para status, tipos e categorias (valores da seção 5 do diagnóstico, com categorias do caixa unificadas).
- **FKs, UNIQUE e índices** onde a v1 não tinha nenhum; `updated_at` por trigger.
- **Função `converter_lead(lead_id, ...)`** (RPC, uma transação): cria ou localiza o cliente (CPF/telefone), cria a obra, lança a entrada no caixa e fecha o lead. Resolve a "transição atômica" que a v1 só prometia.
- **Triggers de consistência:** editar entrada da obra ajusta o caixa; excluir insumo remove o lançamento ligado.

**Políticas (RLS)**

- `anon`: `SELECT` em `portfolio_items` publicados e `testimonials` visíveis; `INSERT` em `leads` com validação (tamanho dos campos, status forçado para o inicial). Nada mais.
- `authenticated` (o único admin): acesso total às tabelas.
- Cadastro público de usuários **desligado** no Supabase Auth; o admin é criado manualmente.
- Anti-spam no formulário público: campo oculto (honeypot) + limite por validação no banco; Cloudflare Turnstile como opção se aparecer spam.

**Storage (criado em migration)**

- `portfolio` e `depoimentos`: leitura pública, escrita só `authenticated`, limite de tamanho e MIME por bucket.
- `contratos`: privado, URL assinada de curta duração.

## Estratégia de migração e segurança dos dados

- **Dados da v1:** nenhum a migrar (confirmado pelo dono: não são reais). O projeto Supabase antigo não é tocado.
- **Mídias da v1:** `scripts/importar-midias` lê `legado/assets/portfolio`, otimiza e envia ao Storage novo. É idempotente (pode rodar de novo sem duplicar) e só lê o `legado`.
- **Textos do portfólio:** os 15 itens são recriados em `seed.sql` com redação nova.
- **Evolução do schema:** só migrations novas; nunca editar uma migration já aplicada.
- **Produção:** nada é aplicado em projeto Supabase sem sua autorização explícita. Ambiente local com `supabase start` (requer Docker; **não verifiquei se o Docker está instalado aqui**).
- **Backup:** o plano gratuito não tem. Antes de ir ao ar com dados reais, plano Pro ou exportação agendada.

## Ambientes e variáveis

- Públicas (entram no build, podem ser vistas no navegador): URL do Supabase, chave publishable, URL do site, número do WhatsApp, ID do Meta Pixel, `BASE_PATH`.
- Segredos (só no Supabase, nunca no repositório): token da Conversions API e service key das funções.
- `.env.example` documenta tudo, sem valores reais.

## Deploy

`push` na `main` → Actions: instala, lint, tipos, testes → build do `site` e do `admin` → junta em um artefato (`/` e `/admin`) → publica no GitHub Pages. Migração para Cloudflare Pages = trocar o passo de publicação.
