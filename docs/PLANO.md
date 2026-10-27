# Plano

> Checklist viva. O Claude atualiza este arquivo a cada tarefa concluída.
> Ao retomar uma sessão, peça: "leia docs/PLANO.md e continue da próxima tarefa".
> Cada entrega é utilizável sozinha e termina com `format:check`, `lint`, `typecheck`, `test` e `build` verdes.
> Referências: itens `#N` são da [`SPEC.md`](SPEC.md); modelo de dados em [`ARQUITETURA.md`](ARQUITETURA.md).

## Em andamento

- [ ] **E1 e E2 funcionando em produção** (login, formulário, gravação de lead e CRM, testados pelo dono). Playwright já cobre o site e o painel nas 4 larguras (48 execuções passando). Restam, e passam para a E9 se não forem feitos antes: URL de redirecionamento da recuperação de senha, tema escuro e divisão do bundle do painel.
- [ ] **E3 — Site público premium, em andamento.** Feito: home, portfólio, fontes e testes (72 execuções no Playwright). Falta: SEO, política de privacidade, banner de cookies, Meta Pixel, landing pages e medir o Lighthouse.

## Próximas

### E1 — Banco e login (fundação do painel)

_Utilizável:_ o admin entra no painel com e-mail e senha e vê o menu vazio; o banco existe com segurança correta.
Spec: #5, #14 (parte), #13 do painel responsivo.

- [x] Migration base (`supabase/migrations/20261027120000_base.sql`): enums, `updated_at`, `admins`, `is_admin()`, `leads`
- [x] RLS: anônimo só insere lead (colunas do formulário, sem escolher status); só quem está em `admins` acessa; default privileges sem acesso amplo
- [x] Testes de RLS (pgTAP, 14 casos) no CI com Supabase local: **passando** (`Tests=14`, `Result: PASS`)
- [x] Painel: login, logout, recuperação de senha (PKCE), guard por admin, rotas por hash (código e build ok; **login real ainda não testado**)
- [x] Layout responsivo do painel: menu lateral no PC, navegação inferior no celular (**celular não verificado visualmente**)
- [ ] Tema escuro opcional do painel
- [x] Migration aplicada no Supabase real e admin inserido em `admins` (verificado: tabelas antigas intactas com RLS; anônimo só insere as 10 colunas do formulário)
- [x] ~~Desligar o cadastro público~~ — **não será desligado**: o projeto é compartilhado com outro app que pode depender dele; a tabela `admins` já protege os dados da DK
- [ ] Autorizar a URL do painel em Authentication → URL Configuration → Redirect URLs (necessário para a recuperação de senha)
- [x] Login testado pelo dono em https://arthurfontes189.github.io/dk_revestimentos/admin/
- [x] Playwright: login (redirecionamento sem sessão) e painel com sessão simulada nas larguras 360/768/1280/1920, sem rolagem horizontal; layout conferido também por capturas de tela
- [ ] Dividir o bundle do painel (hoje 598 kB, 175 kB comprimido) quando houver módulos reais

**Precisa de você:** testar o login no painel publicado e autorizar a URL de redirecionamento (ou me pedir para fazê-lo).

### E2 — Captação de leads (já gera valor para os anúncios)

_Utilizável:_ o visitante pede orçamento e o lead aparece no CRM, com origem da campanha.
Spec: #3, #4 (UTM), #6.

- [x] Formulário de orçamento no site (2 passos, validação Zod, isca anti-spam, erro claro com atalho ao WhatsApp se o banco falhar) + botão para abrir o WhatsApp. Validação e passo 2 conferidos no navegador; **envio real ainda não testado**
- [x] Captura de `utm_*`, `fbclid` e página de entrada (sessionStorage), gravada no lead; script global com 843 bytes
- [x] CRM no painel: lista, filtro por status com contagem, contador de pendentes, mudança de status, exclusão com confirmação, botão de WhatsApp (**não testado com dados reais**)
- [x] Layouts de CRM: cards no celular alternando com o detalhe; lista + detalhe lado a lado no PC (**celular não verificado visualmente**)
- [x] Regras testadas no `@dk/core`: origem, mensagem de orçamento, filtros de leads, formatação de telefone (46 testes)
- [x] Teste ponta a ponta (Playwright, Supabase simulado): enviar orçamento (com UTM, erro do banco e isca anti-spam), listar, filtrar, abrir detalhe e trocar status, nas 4 larguras; roda no CI
- [x] Orçamento de teste enviado no site publicado e visto em Leads pelo dono: formulário, gravação e CRM funcionam em produção
- [ ] Rate limit / captcha no formulário público se aparecer spam (hoje só a isca anti-spam e as validações do banco)

### E3 — Site público premium

_Utilizável:_ o site completo no ar, pronto para receber tráfego (já com WhatsApp real quando o cliente informar).
Spec: #1, #2, #4, #14 (site), direção visual.

- [x] Fontes hospedadas no próprio site: Fraunces (títulos) e Plus Jakarta Sans (texto)
- [x] Mídias da v1 reaproveitadas: 9 fotos e 5 vídeos (comprimidos com `ffmpeg`, sem áudio); o PDF era a mesma foto do oratório e ficou de fora. Imagens otimizadas em WebP no build (62 variantes)
- [x] Home: topo com foto real, serviços, portfólio (14 itens) com filtro por categoria e ampliação (foto e vídeo), como trabalhamos, orçamento, rodapé; menu sem JavaScript no celular; barra de ações fixa no celular (some no topo e no formulário)
- [x] Textos recriados em pt-BR, sem números nem fatos inventados (**aguardam aprovação do cliente**); títulos e descrições do portfólio escritos a partir do que as fotos mostram
- [ ] **Portfólio provisório:** hoje os 14 itens vivem no código (`apps/site/src/data/portfolio.ts`). A E4 os move para o banco e o Storage, com edição pelo painel. Decidir como o site estático reflete mudanças (rebuild automático ao publicar)
- [ ] Decidir sobre o `legado/assets/hero-bg.jpg`: parece render ou banco de imagens, não uma obra da DK; **não foi usado**. Só entra se o cliente confirmar que é dele ou tiver os direitos
- [ ] Migration `portfolio_items` + bucket `portfolio` (junto com a E4)
- [ ] SEO: meta, Open Graph, dados estruturados de negócio local, sitemap, política de privacidade
- [ ] Banner de cookies (LGPD) + Meta Pixel (`PageView`, `ViewContent`, `Contact`, `Lead`), desligado sem ID
- [ ] Landing pages para anúncios
- [ ] Lighthouse mobile e desktop ≥ 90; LCP < 2,5 s; home ≤ 1 MB sem vídeos

**Precisa de você:** WhatsApp real e domínio (podem vir depois), aprovação dos textos, ID do pixel quando houver conta de anúncios.

### E4 — Portfólio e depoimentos pelo painel

_Utilizável:_ o cliente publica projetos e depoimentos sozinho, sem mexer em código.
Spec: #12, #13 (depoimentos).

- [ ] Otimização no navegador (WebP em 3 larguras, blur, poster de vídeo) com limites de tamanho
- [ ] Painel de portfólio: criar, editar, ordenar, destacar, publicar, excluir (remove os arquivos)
- [ ] Migration `testimonials` + bucket `depoimentos`; aba de depoimentos com envio em lote, ordem, ocultar, tarja/recorte e aviso de privacidade
- [ ] Seção de depoimentos no site, que só aparece com itens visíveis

### E5 — Clientes e conversão de lead

_Utilizável:_ transformar um lead fechado em cliente e obra numa única operação.
Spec: #6 (conversão), #7.

- [ ] Migration `clients` com código `CLI-XXXX` por sequência única
- [ ] Função `converter_lead` (RPC atômica): localiza ou cria cliente por CPF/telefone, cria obra, lança entrada, fecha o lead
- [ ] Painel de clientes (CPF no cadastro), total contratado e total pago corretos
- [ ] Testes da função e de concorrência do código do cliente

### E6 — Fichas de produção (obras)

_Utilizável:_ acompanhar cada obra do orçamento à entrega.
Spec: #8.

- [ ] Migration `services` com FKs, status em enum e datas tipadas
- [ ] Painel de obras: criar, editar, status, quitação rápida, conclusão
- [ ] Editar a entrada ajusta o caixa (trigger); excluir obra trata os lançamentos vinculados
- [ ] DRE da obra usando `calcularDre` de `@dk/core`

### E7 — Equipe, diárias e insumos

_Utilizável:_ custo real de cada obra.
Spec: #9, #10.

- [ ] Migrations `employees`, `service_workers`, `service_expenses`; bucket privado `contratos` com URL assinada
- [ ] Painel de funcionários (um só formulário) e alocação por obra com status de pagamento persistido
- [ ] Insumos por obra com opção de lançar no caixa; excluir o insumo remove o lançamento

### E8 — Fluxo de caixa

_Utilizável:_ saldo e movimentações do negócio.
Spec: #11.

- [ ] Migration `transactions` com categorias unificadas e `date`
- [ ] Painel de caixa com filtro por período e categoria, saldo e totais via `resumirCaixa`
- [ ] Excluir entrada de obra reflete no valor recebido da obra

### E9 — PWA, qualidade e produção

_Utilizável:_ pronto para o cliente usar e divulgar.
Spec: #14, requisitos não funcionais.

- [ ] PWA: service worker, ícones 192/512 e maskable; instalação em Android e iOS
- [ ] Estender o Playwright aos novos fluxos (clientes, obras, caixa…); modais com foco preso e `role="dialog"`
- [ ] Meta Conversions API (Edge Function) — se não couber antes, entra aqui
- [ ] Migração do deploy para Cloudflare Pages antes de anúncios pagos; domínio próprio
- [ ] Supabase Pro (backup e sem pausa) e checklist de entrega: trocar senha do admin, WhatsApp e pixel reais

## Concluídas

- [x] Fase 1 — Diagnóstico da v1 (`DIAGNOSTICO-V1.md`)
- [x] Fase 2 — Spec aprovada (`SPEC.md`)
- [x] Fase 3 — Stack e arquitetura (ADR 0001, `ARQUITETURA.md`)
- [x] Esqueleto do projeto: monorepo, regras de negócio testadas em `@dk/core`, tokens de design, lint, formatação, tipos e testes
- [x] Repositório no GitHub (`ArthurFontes189/dk_revestimentos`) com CI e deploy verdes
- [x] Site e painel (placeholders) publicados no GitHub Pages: `/dk_revestimentos/` e `/dk_revestimentos/admin/`
- [x] Variáveis do repositório: `SITE_URL`, `BASE_PATH`, `PUBLIC_WHATSAPP_NUMBER` (fictício) e `PUBLIC_SUPABASE_URL`
