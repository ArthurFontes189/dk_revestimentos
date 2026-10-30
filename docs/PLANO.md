# Plano

> Checklist viva. O Claude atualiza este arquivo a cada tarefa concluída.
> Ao retomar uma sessão, peça: "leia docs/PLANO.md e continue da próxima tarefa".
> Cada entrega é utilizável sozinha e termina com `format:check`, `lint`, `typecheck`, `test` e `build` verdes.
> Referências: itens `#N` são da [`SPEC.md`](SPEC.md); modelo de dados em [`ARQUITETURA.md`](ARQUITETURA.md).

## Em andamento

- [ ] **E1 e E2 funcionando em produção** (login, formulário, gravação de lead e CRM, testados pelo dono). Playwright já cobre o site e o painel nas 4 larguras (48 execuções passando). Restam, e passam para a E9 se não forem feitos antes: URL de redirecionamento da recuperação de senha, tema escuro e divisão do bundle do painel.
- [ ] **E3 — Site público premium, em andamento.** Feito: home, portfólio, fontes, SEO, privacidade, cookies com Meta Pixel, páginas de anúncio e Lighthouse (144 execuções no Playwright). Falta: aprovação dos textos pelo cliente, revisão da política de privacidade e o LCP um pouco acima da meta.

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
- [x] Portfólio dos 14 itens: embutido no código como reserva e fonte do importador; a E4 o torna editável pelo painel
- [ ] Decidir sobre o `legado/assets/hero-bg.jpg`: parece render ou banco de imagens, não uma obra da DK; **não foi usado**. Só entra se o cliente confirmar que é dele ou tiver os direitos
- [x] SEO: título, descrição, canonical, Open Graph e Twitter (imagem 1200×630 absoluta), dados estruturados `Organization` sem telefone/endereço inventados, `sitemap.xml` e `robots.txt`, favicon próprio
- [x] **Indexação desligada por padrão** (`noindex` + `robots` fechado) enquanto o site está em homologação; `PUBLIC_INDEXAR=true` liga no deploy de produção
- [x] Política de privacidade (`/privacidade/`), texto-modelo alinhado à LGPD. **Falta o cliente informar razão social, CNPJ e e-mail de contato e revisar (idealmente com apoio jurídico) antes de divulgar com anúncios**
- [x] Banner de cookies + Meta Pixel (`PageView`, `ViewContent`, `Contact`, `Lead`): só existe se `PUBLIC_META_PIXEL_ID` for válido; a Meta só é carregada após o aceite; recusar apaga `_fbp`/`_fbc`; "Recusar" e "Aceitar" com o mesmo peso; reabre pelo rodapé
- [x] Páginas de anúncio (`noindex`, leves, com o serviço já escolhido no formulário e a campanha gravada no lead): `/decks-e-areas-externas/`, `/moveis-sob-medida/`, `/marcenaria-sob-medida/`. Não há página de cozinhas e closets porque não há fotos reais desse tipo
- [x] Lighthouse (laboratório, 4G lento simulado, com compressão): home celular 96, desktop 100; anúncios 97 a 98; acessibilidade 100 e boas práticas 100 em todas. LCP: home celular 2,8 s, anúncios 2,3 a 2,6 s (meta 2,5 s, quase lá); home desktop 0,6 s
- [ ] Reduzir o LCP da home no celular (2,8 s) e das páginas de anúncio (2,6 s) para abaixo de 2,5 s; confirmar com dados reais (PageSpeed/Search Console) depois de publicado em produção
- [ ] Meta Conversions API (envio do `Lead` pelo servidor): fica na E9

**Precisa de você:** domínio (pode vir depois; o WhatsApp real já está na variável do GitHub desde 2026-10-28 e vai ao ar no próximo deploy), aprovação dos textos, ID do pixel quando houver conta de anúncios.

### E4 — Portfólio e depoimentos pelo painel

_Utilizável:_ o cliente publica projetos e depoimentos sozinho, sem mexer em código.
Spec: #12, #13 (depoimentos).

**Estado: código no GitHub, CI verde (pgTAP 38 de 38) e migration APLICADA no Supabase real em 2026-10-28 (verificada por consultas). Falta rodar o importador e testar os envios pelo painel.**

- [x] Migration `20261027200000_portfolio_depoimentos.sql`: tabelas `portfolio_items` e `testimonials`, buckets `portfolio` (25 MB, webp e mp4) e `depoimentos` (5 MB, webp) com leitura pública e escrita só do admin, RLS e políticas de Storage só dos buckets da DK. Testes pgTAP escritos (23 casos), **ainda não executados** (rodam no CI, que exige o push)
- [x] `@dk/media`: larguras (480/960/1920 sem ampliar), hash do conteúdo no nome do arquivo (cache de 1 ano seguro), URLs públicas, validação (imagem até 15 MB; vídeo MP4 até 25 MB), tarja, conversão das linhas do banco; pipeline do navegador (WebP, blur, capa do vídeo)
- [x] Painel de portfólio: novo item (foto ou vídeo), editar, subir/descer, ocultar/publicar, destacar, excluir (apaga também os arquivos)
- [x] Painel de depoimentos: envio de várias imagens, **tarja de privacidade pintada nos pixels** (verificado: o pixel sob a tarja sai preto), nome e legenda opcionais, ordem, ocultar, excluir
- [x] Site lê o portfólio e os depoimentos do banco **na publicação**; sem banco (ou banco vazio) usa os 14 itens embutidos. Seção de depoimentos só aparece com itens visíveis. Verificado com o banco inacessível: o build termina e usa a reserva
- [x] Publicação automática a cada 30 minutos (`schedule` no `deploy.yml`) para o que o admin muda chegar ao site, sem tokens nem segredos
- [x] Script `pnpm importar:portfolio` (importa os 14 itens atuais para o banco e o Storage; pede e-mail e senha no terminal; `--simular` testado: 14 itens, 33 arquivos WebP, 3,0 MB). **Ainda não executado de verdade**
- [x] e2e: 36 execuções do painel de mídia + testes do site no modo "lido do banco" (192 no total)
- [x] Migration aplicada no Supabase real pelo SQL Editor, em uma transação. Verificado: 2 tabelas novas com RLS, 4 políticas, buckets `portfolio` e `depoimentos` (públicos, com limites), 4 políticas `dk_midia_*` em `storage.objects`, visitante só com `SELECT`, e o outro app intacto (9 linhas em `chunks`, bucket e políticas `sources`)
- [x] Testes pgTAP executados no CI com Postgres de verdade: 38 de 38 (15 da E1 + 23 da E4)
- [x] Publicação manual (workflow_dispatch) feita em 2026-10-28 e **site no ar lendo do banco**: 14 itens, 14 imagens do Storage carregadas (0 quebradas), todas com srcset, dimensões e blur, 5 vídeos respondendo 200. A seção de depoimentos continua oculta (ainda não há nenhum)
- [x] **Importador executado pelo dono** em 2026-10-28 e verificado por consultas: 14 itens (5 vídeos, todos publicados), 33 arquivos WebP + 5 MP4 (9,8 MB) no Storage, 0 variantes ou vídeos faltando, cache de 1 ano gravado. Como visitante anônimo: lê os 14 itens, a escrita é negada (401), foto e vídeo públicos respondem 200 e a listagem do bucket volta vazia
- [ ] Testar de verdade, pelo painel, o envio de uma foto, de um vídeo e de um depoimento com tarja, e ver o resultado no site depois da próxima publicação
- [ ] Limitação conhecida: o Safari/iPhone não gera WebP no navegador; o painel avisa e pede Chrome, Edge ou Firefox (ou o computador) para enviar fotos
- [ ] Trocar a mídia de um item existente (hoje só é possível excluir e criar de novo)

### E5 — Clientes e conversão de lead

_Utilizável:_ transformar um lead fechado em cliente e obra numa única operação.
Spec: #6 (conversão), #7.

**Desenho proposto (aguarda aprovação).** A `converter_lead` completa precisa de `services` (E6) e `transactions` (E8), que ainda não existem. Para a E5 ficar utilizável sozinha, ela entrega a conversão em duas camadas:

- **E5:** a função localiza ou cria o cliente e fecha o lead, numa única transação. Já guarda `lead_id` no cliente (origem do anúncio fica rastreável).
- **E6/E8:** a mesma função é estendida (`create or replace`) para também criar a obra e lançar a entrada no caixa, sem mudar o que o painel chama.

Peças da E5:

1. Migration `clients`: `codigo` `CLI-NNNN` gerado por sequência no banco (UNIQUE, nunca reutilizado após exclusão), `nome`, `cpf` (opcional, UNIQUE quando preenchido, validado com dígitos), `telefone` (UNIQUE), `endereco`, `obs`, `lead_id` opcional, `created_at`/`updated_at`. RLS só para o admin, sem `GRANT` ao `anon`, `revoke` explícito (projeto compartilhado).
2. RPC `converter_lead(lead_id)`: acha cliente por CPF ou telefone, senão cria; marca o lead como `Fechado`; rejeita lead inexistente, já fechado ou chamada de quem não é admin. Só `authenticated` executa.
3. `@dk/core`: `clienteSchema` (Zod) e validação de CPF, com testes.
4. Painel: página **Clientes** (lista, busca por nome/telefone/CPF, criar, editar, excluir com confirmação) e botão **Converter em cliente** no CRM de leads.
5. Testes: Vitest (CPF e schema), pgTAP (RLS de `clients`, conversão, idempotência, código único e sem reuso, não-admin barrado) e Playwright nas 4 larguras.
6. "Total contratado" e "total pago" dependem de obras e caixa: o painel só mostra esses totais a partir da E6/E8 (hoje seriam sempre zero).

- [x] Migration `20261028120000_clientes.sql`: tabela `clients` com código `CLI-NNNN` por sequência (único, nunca reaproveitado), telefone único sem DDI, CPF opcional único, `lead_id` de origem, RLS só do admin e `revoke` explícito
- [x] Função `converter_lead` (RPC atômica): trava o lead, localiza o cliente pelo telefone ou cria, fecha o lead; recusa não-admin, lead inexistente e lead já convertido (obra e entrada no caixa entram na E6/E8)
- [x] `@dk/core`: `cpfValido`, `formatarCpf`, `normalizarTelefone`, `clienteSchema` e `buscarClientes`, com 22 testes novos (116 no total)
- [x] Painel: página **Clientes** (lista, busca sem acento por nome/telefone/CPF/código, criar, editar, excluir, WhatsApp) e botão **Converter em cliente** no CRM, com aviso quando o telefone já era cliente
- [x] Menu inferior do celular ajustado: com 5 itens, "Depoimentos" saía da tela a 360 px; agora cabe (teste permanente no `admin.spec.ts`)
- [x] Testes: pgTAP `rls_clientes.test.sql` (20 asserções: anon e não-admin barrados, conversão, reaproveitamento por telefone com DDI, lead repetido, código não reutilizado, telefone/CPF duplicados) e 9 cenários e2e novos (229 execuções passando no total)
- [x] pgTAP da E5, E6 e E7 passou no CI (job `banco`, run 14, 2026-10-30)
- [x] Migration aplicada no Supabase real em 2026-10-28 (SQL Editor, numa transação) e verificada: `clients` com RLS e a política `clients_admin_all`, visitante sem `SELECT` nem `INSERT`, `converter_lead` executável só por `authenticated`, 10 colunas, sequência liberada ao admin. Outro app intacto (9 linhas em `chunks`, bucket `sources`). `CLAUDE.md` já lista a nova versão no `migration repair`
- [ ] Total contratado e total pago corretos (depende da E6/E8)

### E6 — Fichas de produção (obras)

_Utilizável:_ acompanhar cada obra do orçamento à entrega.
Spec: #8.

**Desenho proposto (aguarda aprovação).** O ponto delicado é o dinheiro recebido: na v1 o valor da entrada ficava na obra **e** no caixa, e os dois divergiam. Para ter uma única fonte da verdade:

1. **O caixa é a fonte do "recebido".** A obra **não** guarda `valor_entrada`. O valor recebido é a soma das **entradas** de `transactions` ligadas à obra (view `obras_resumo`, `security_invoker`, com `valor_recebido` e `saldo`). Assim, apagar um lançamento no caixa reflete na obra sozinho, sem trigger de mão dupla e sem divergência.
2. **A tabela `transactions` nasce na E6** (só o necessário: `tipo` entrada/saída, `categoria`, `descricao`, `valor numeric(12,2) > 0`, `data date`, `client_id`, `service_id`). A E8 fica só com o **painel do caixa** (lançamentos manuais, filtros, saldo) e as categorias de saída.
3. **RPCs atômicas** (admin, `security invoker` + `is_admin()`):
   - `definir_recebido(obra_id, valor)`: mantém um único lançamento "Entrada da obra" por obra (índice único parcial) e o ajusta; zero remove. É o "editar a entrada ajusta o caixa".
   - `registrar_recebimento(obra_id, valor)`: acrescenta uma entrada (quitação rápida = saldo inteiro). Recusa passar do valor total.
   - `converter_lead(lead_id, obra jsonb default null)`: estendida. Sem `obra`, continua igual à E5; com `obra`, também cria a ficha e o lançamento da entrada, tudo numa transação.
4. **`services`:** `client_id` obrigatório (`on delete restrict`: cliente com obra não é excluído, o painel explica), `lead_id` opcional, `descricao`, `materiais`, `forma_pagamento`, `responsavel`, `data_entrega date`, `valor_total numeric(12,2) >= 0`, `status` em enum (`status_obra`) e `concluida_em` preenchida pelo banco ao virar Concluído.
5. **Excluir obra** apaga também os lançamentos ligados (a v1 deixava lixo no caixa). O painel mostra antes quanto já foi recebido e pede confirmação.
6. **DRE** da obra com `calcularDre` de `@dk/core`. Diárias e insumos só existem na E7, então até lá o DRE mostra custo zero, sem número inventado.
7. **Painel:** página **Obras** (lista com filtro por status e saldo a receber; detalhe com ficha, DRE, recebimentos; criar, editar, mudar status, quitar saldo, excluir) e **Criar ficha de obra** a partir do lead e da página do cliente. A página **Clientes** passa a mostrar total contratado e total pago (fecha a pendência da E5).
8. **Testes:** Vitest (validação da obra, saldo), pgTAP (RLS, `definir_recebido`, `registrar_recebimento`, excesso, conversão com obra, exclusão em cascata, cliente com obra protegido, `concluida_em`) e Playwright nas 4 larguras.

- [x] Migration `20261029120000_obras_caixa.sql`: `services` + `transactions` + view `obras_resumo` + RPCs `definir_recebido` e `registrar_recebimento`, com RLS só do admin e `revoke` explícito (pgTAP passou no CI em 2026-10-30; ainda não aplicada no Supabase real)
- [x] `converter_lead(lead_id, obra jsonb)` estendida (cria cliente, obra e entrada numa transação; a chamada antiga só com `lead_id` segue valendo)
- [x] `@dk/core`: `obraSchema`, `novaObraSchema`, `lerValorBRL` e `totaisDoCliente`, com testes
- [x] Painel de obras: lista com filtro por status, criar (com entrada inicial), editar, mudar status, quitar saldo e excluir com aviso do que sai do caixa. Menu do celular reduzido para caber 6 itens a 360 px
- [x] Clientes: total contratado e total pago (obras somadas e só entradas do caixa)
- [x] DRE da obra usando `calcularDre` (custos zerados até a E7)
- [x] Testes: pgTAP `rls_obras_caixa.test.sql` (18 asserções, passou no CI) e 7 cenários e2e novos em `obras.spec.ts` (257 execuções passando)
- [x] Botão **Converter e criar obra** no CRM de leads (cliente, ficha e entrada numa transação) com 2 cenários e2e. A criação a partir da página do cliente não foi feita: a página Obras já cria a ficha escolhendo o cliente
- [ ] Aplicar a migration no Supabase real (só com sua autorização explícita; incluir a versão no `migration repair`)

### E7 — Equipe, diárias e insumos

_Utilizável:_ custo real de cada obra.
Spec: #9, #10.

**Desenho proposto (aguarda aprovação).** Na v1, `workers` e `expenses` eram JSON dentro da obra: cópias por valor do funcionário, ids `Date.now()`, "pago" e "excluir insumo" que não persistiam, contrato em base64 e diária que nunca virava caixa. Na v2 viram tabelas relacionais, e a E7 liga o custo ao DRE e ao caixa criados na E6.

1. **`employees`** (cadastro único, um só formulário): `nome`, `cargo` (texto livre, com os cargos da v1 como sugestão), `telefone` (só dígitos, como em `clients`), `chave_pix`, `diaria_padrao numeric(12,2) >= 0`, `ativo boolean`, `contrato_path` (caminho no bucket, nunca o arquivo). Excluir um funcionário alocado é barrado (`on delete restrict`); o painel sugere desativar.
2. **`service_workers`** (alocação por obra): `service_id` (cascata com a obra), `employee_id` (`restrict`), `valor_diaria` e `dias_trabalhados` **gravados na alocação** (copiar o valor é intencional: mudar a diária padrão depois não reescreve obras antigas), `pago boolean`, `pago_em date`. Índice único `(service_id, employee_id)`. O total da diária é `valor_diaria × dias` e fica numa coluna gerada.
3. **`service_expenses`** (insumos): `service_id` (cascata), `categoria` (as 7 da v1), `descricao`, `valor > 0`, `data`.
4. **Caixa sem divergência.** Insumo: a RPC `salvar_insumo(...)` cria, ajusta ou remove o lançamento de **saída** ligado (`transactions.expense_id`, `on delete cascade`, índice único parcial), na mesma transação, conforme a opção "lançar no caixa". Excluir o insumo apaga o lançamento por cascata, sem trigger de mão dupla. Diária: `marcar_diaria_paga(worker_id, pago)` lança a saída "Diárias" ao marcar e a remove ao desmarcar (`transactions.worker_id` com cascata). Assim "pago" persiste e o caixa acompanha.
5. **DRE real.** A view `obras_resumo` ganha `custo_diarias` e `custo_insumos` (somas das tabelas novas). O painel passa a usar `calcularDre` com esses valores, fechando o "custo zero até a E7" da E6. Em centavos no front; `numeric(12,2)` no banco.
6. **Contratos privados.** Bucket `contratos` (privado, PDF/imagem, limite de tamanho), com política em `storage.objects` só para `is_admin()` e só neste bucket (o projeto Supabase é compartilhado). O painel envia o arquivo, guarda o `contrato_path` e abre por **URL assinada de 60 s** (`createSignedUrl`). No iOS, a URL é gerada e aberta no mesmo clique, para não cair no bloqueio de popup da v1. Trocar ou apagar o contrato remove o arquivo antigo.
7. **Painel:** página **Equipe** (lista, filtro ativo/inativo, criar/editar, contrato, WhatsApp) e, dentro de cada obra, as seções **Equipe da obra** (alocar, dias, marcar pago) e **Insumos** (adicionar, "lançar no caixa", excluir). O menu do celular já está no limite (6 itens): **Equipe** entra no menu lateral e a barra inferior ganha um item "Mais" (decidir na aprovação).
8. **`@dk/core`:** `funcionarioSchema` (reaproveita `normalizarTelefone`), `alocacaoSchema`, `insumoSchema` e `CATEGORIAS_INSUMO`; `calcularDre` e `totalDiarias` já existem.
9. **Testes:** Vitest (schemas, totais, arredondamento em centavos), pgTAP (RLS das 3 tabelas e do bucket, diária e insumo geram e removem lançamento, cascata, índice único da alocação, funcionário alocado protegido, DRE da view) e Playwright nas 4 larguras com o Storage simulado.

**Fora do escopo da E7:** folha de pagamento mensal, adiantamentos e relatórios por funcionário (depois do MVP). Categorias de saída livres e o painel de caixa são da E8.

**Decisões aprovadas:** a diária paga sempre lança a saída no caixa; o menu do celular usa o item **Mais**.

**Perguntas (respondidas):**

- A diária paga deve **sempre** lançar saída no caixa (como propus), ou só quando você escolher, como no insumo?
- O item **Mais** no menu do celular está bom, ou prefere trocar um dos 6 itens atuais por Equipe?

- [x] Migration `20261030120000_equipe_insumos.sql` (pgTAP passou no CI em 2026-10-30; ainda não aplicada no Supabase real): `employees` + `service_workers` + `service_expenses` + ligação em `transactions` + bucket `contratos` + RPCs, com RLS só do admin e `revoke` explícito
- [x] `obras_resumo` com `custo_diarias` e `custo_insumos`; DRE da obra com custo real
- [x] `@dk/core`: schemas de funcionário, alocação e insumo, com testes
- [x] Painel: página **Equipe** (um só formulário, filtro ativo/inativo, contrato por URL assinada de 60 s) e, em cada obra, **Equipe e insumos** (alocar, marcar pago, remover). Menu do celular com 4 itens + **Mais**
- [x] Insumos por obra com opção de lançar no caixa; excluir o insumo remove o lançamento
- [x] Testes: pgTAP `rls_equipe_insumos.test.sql` (20 asserções, passou no CI) e 12 cenários e2e novos (310 execuções passando)
- [ ] Aplicar a migration no Supabase real (só com sua autorização explícita; incluir a versão no `migration repair`)

### E8 — Fluxo de caixa

_Utilizável:_ saldo e movimentações do negócio.
Spec: #11.

- [ ] Categorias de saída unificadas (a tabela `transactions` já nasce na E6)
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
