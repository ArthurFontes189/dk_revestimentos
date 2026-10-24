# Diagnóstico da v1 (DK Revestimentos)

> Base: `./legado` (somente leitura), branch `main`, remote `github.com/ArthurFontes189/DK-`.
> Método: leitura do código por subagente `pesquisador`, com conferência manual dos achados críticos.
> Nenhum valor de chave ou senha é reproduzido aqui.
> Não lido: conteúdo de `css/*` (exceto `variables.css`), opções de `srvFormaPag` e textos institucionais do `index.html`.

## 0. Alertas em destaque

1. **Banco totalmente aberto (crítico).** `database/schema.sql:129-139,186-188` e a cópia em `js/services/api.js:683-696` executam `DISABLE ROW LEVEL SECURITY` nas 6 tabelas e `GRANT ALL ... TO anon`. A chave pública está em `js/config.js`, então **qualquer visitante lê, altera e apaga leads, clientes (CPF), caixa, funcionários (PIX, contratos) e portfólio**. O realtime também entrega esses eventos a qualquer cliente anônimo. Conferido manualmente.
2. **Login falso (crítico).** `js/modules/auth.js:41` compara usuário e senha fixos (4 dígitos) no navegador. A senha padrão aparece também em `auth.js:60` e em `admin.html:241-246`. "Logado" é a flag `localStorage.marcenaria_admin_logged`, que se liga pelo console. Conferido manualmente.
3. **Storage aberto.** `database/habilitar_storage.sql` dá `FOR ALL` a `anon` no bucket `portfolio`. Atenuante: nenhum JS usa o bucket (conferido), mas a política vale se o SQL foi executado em produção.
4. **XSS generalizado.** Quase todo render usa `innerHTML` sem escape (`leads.js`, `clients.js`, `services.js`, `employees.js`, `finance.js`, `portfolio.js`, `toast.js:50`). Vetor realista: o formulário público de orçamento grava `nome`, `telefone` e `bairro`, que são renderizados no painel do admin.
5. **Credenciais no repositório.**
   - `js/config.js` está versionado e contém só a chave **publishable** (`sb_publishable_...`), a URL e o project ref.
   - **Não há `service_role` nem `sb_secret_`** no HEAD nem no histórico (busca em todos os commits).
   - A chave publishable aparece em 6 commits do histórico.
   - O risco real é a combinação chave pública + RLS desligado: na prática equivale a uma chave de administrador exposta.

**Contexto confirmado pelo dono:** o Supabase atual **não tem dados reais** (projeto ainda em desenvolvimento). Isso rebaixa a urgência: não é preciso trancar o banco da v1 agora. Na v2 o RLS e a autenticação real entram desde o início, e dá para recriar o schema do zero, sem migração de dados (a decidir na Fase 3).

## 1. Inventário de funcionalidades (o que o código faz)

| Módulo            | Arquivo                                       | Comportamento real                                                                                                                                                                         |
| ----------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Site público      | `index.html`, `js/app.js`                     | Catálogo de portfólio, formulário de orçamento, menu mobile. Visitante anônimo também chama `initSupabase()` e faz polling dos dados internos.                                             |
| Leads / orçamento | `modules/leads.js`                            | Insere em `leads` e abre `wa.me`. A mensagem é concatenada em `bairro` (não há coluna própria). Se o Supabase falha, aborta e não abre o WhatsApp. Sem Supabase, grava só no localStorage. |
| CRM               | `modules/leads.js`                            | Cards, filtro por status, atualização otimista (se o banco falha, a UI mantém o status novo), exclusão.                                                                                    |
| Clientes          | `modules/clients.js`                          | Código `CLI-` + (contagem + 1). Vínculo com obras por id, CPF ou nome. Calcula total contratado e total pago.                                                                              |
| Fichas / Obras    | `modules/services.js` (~1330 linhas)          | Tabela `services`. Cria cliente se não existir, lança entrada no caixa, remove o lead ao salvar. Hub 360° com equipe (diárias), insumos e DRE (receita − diárias − insumos, margem %).     |
| Funcionários      | `modules/employees.js`                        | Cadastro com cargo, PIX, diária padrão, status, contrato anexo. Dois formulários duplicados (aba e modal) com validações diferentes.                                                       |
| Caixa             | `modules/finance.js`                          | Entradas e saídas, saldo calculado no cliente, sem filtro por período.                                                                                                                     |
| Portfólio         | `modules/portfolio.js`, `services/storage.js` | Foto, MP4, YouTube/Shorts, Drive, PDF. 15 itens embutidos no JS e em `seeds_portfolio_gdrive.sql`. Mídia enviada pelo admin vira base64 em `midia_url`.                                    |
| Auth              | `modules/auth.js`                             | Ver alerta 2.                                                                                                                                                                              |
| Sincronização     | `services/api.js`                             | `SELECT *` das 6 tabelas a cada 12 s, a cada evento realtime e ao focar a aba.                                                                                                             |
| PWA               | `manifest.json`                               | **Só manifest.** Não há service worker, nem ícones PNG 192/512. O "offline" é apenas localStorage.                                                                                         |

### Divergências entre documentação e código

- **Código de cliente:** o README diz `CLI-XXXX`, mas coexistem `CLI-0001` por contagem (`clients.js:16-19`) e `CLI-AAAAMMDD-NNNN` aleatório (`services.js:181`).
- **CPF:** o README fala em cadastro com CPF, mas o modal de cliente não tem o campo. O CPF só entra pela ficha de obra.
- **Transição lead → cliente:** a ARCHITECTURE diz "atômica", mas são várias chamadas separadas, sem transação.
- **Realtime:** o README cita WebSocket, mas na prática o sync é por polling mais refetch completo.
- **Upload de portfólio:** o README fala em upload para o Storage e geração automática de capa. Nada disso existe: vai base64 no banco e a capa é manual.
- **`syncGoogleDriveFolderMedia`:** o nome sugere sincronização, mas só chama `refreshAdminPortfolio`.
- **Painel admin:** o README diz que fica em `index.html`, mas é o `admin.html`.
- **Constante do WhatsApp:** a documentação cita `WHATSAPP_PHONE`, o código usa `MARANARIA_WHATSAPP`.
- **Número do WhatsApp:** `js/config.js` ainda tem placeholder, confirmar com você o número real.
- **Filtros de status:** `CORRECAO_PAINEL_ADMIN.md` usa rótulos diferentes dos valores gravados.

## 2. Modelo de dados (`database/schema.sql`)

Geral: **sem FK, índice, UNIQUE, CHECK ou trigger** em nenhuma tabela. Todas as datas são `TEXT`, em formatos misturados (ISO e `pt-BR`). Migração por `CREATE IF NOT EXISTS` + `ALTER ADD COLUMN IF NOT EXISTS`, sem versionamento. O schema existe em duas cópias divergentes: `schema.sql` e uma string em `api.js:532-708`.

| Tabela         | Colunas principais                                                                                                                                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `leads`        | `id`, `nome`, `telefone`, `bairro`, `tipo_servico`, `status` (default `Pendente de Contato`), `data_hora` TEXT                                                                                                             |
| `clients`      | `id`, `codigo_cliente` (sem UNIQUE), `cpf`, `nome`, `telefone`, `endereco`, `obs`, `data_cadastro` TEXT                                                                                                                    |
| `services`     | `id`, `lead_id`, `client_id`, dados do cliente duplicados, `descricao`, `materiais`, `valor_total`, `valor_entrada`, `forma_pagamento`, `responsavel`, `data_entrega`, `status`, **`workers` JSONB**, **`expenses` JSONB** |
| `transactions` | `id`, `tipo`, `client_id`, `cliente_nome`, `descricao`, `valor`, `categoria`, `data` TEXT                                                                                                                                  |
| `portfolio`    | `id`, `tipo_midia`, `titulo`, `subtitulo`, `categoria`, `descricao`, `midia_url` (base64 ou URL), `poster_url`, `proporcao`, `gdrive_id`, `destaque`                                                                       |
| `employees`    | `id`, `nome`, `cargo`, `telefone`, `chave_pix`, `diaria_padrao`, `status`, `contrato_nome`, `contrato_url` (base64)                                                                                                        |

- **Relações (só lógicas):**
  - `services.client_id` → `clients.id`
  - `services.lead_id` → `leads.id`
  - `transactions.client_id` → `clients.id`
- **JSONB em `services`:** `workers` e `expenses` têm ids `Date.now()` e são cópias por valor dos funcionários. O contrato do trabalhador é base64 dentro do JSON da obra.
- **RLS:** desligado em todas as tabelas, nenhuma policy. Ver alerta 1.
- **Storage:** bucket `portfolio` público, com uma policy `FOR ALL` para `anon`. O código não usa o bucket.
- **Triggers e funções:** nenhum. Código de cliente e totais são calculados no JS.
- **Realtime:** publicação `supabase_realtime` nas 6 tabelas, canal `dk-realtime-sync-v1`, cada evento dispara refetch completo.
- **Possível erro em instalação limpa (inferido da ordem do script, não executado):** `ALTER PUBLICATION ... ADD TABLE employees` (linha 149) vem antes do `CREATE TABLE employees` (linha 160).

## 3. Problemas (além dos alertas)

**Bugs e lógica**

- `leads.js:221-222` exporta funções inexistentes (`ReferenceError` ao carregar).
- `clients.js:53`: "Total Pago" soma também as saídas, então o saldo devedor sai errado.
- `services.js:1057-1068` e `1181-1201`: marcar worker como pago e excluir insumo **não persistem no banco** e são revertidos pelo próximo fetch.
- Workers e insumos são gravados como array inteiro, então vale "última escrita vence" entre dispositivos.
- Editar obra não ajusta o caixa. Excluir obra, transação ou insumo não desfaz os lançamentos ligados.
- Diária de funcionário nunca vira transação de caixa.
- `employees.js`: o fallback "salvo localmente" cria registros fantasmas que o fetch apaga. A exclusão local ocorre mesmo se a do banco falhar.
- Tombstones de exclusão do portfólio ficam no localStorage de cada aparelho, então itens apagados "ressuscitam" em outros aparelhos.
- O merge portfólio seed + nuvem sobrescreve edições do admin.
- O `id` do portfólio é calculado no cliente (`maxId + 1`) e pode divergir do id do banco.
- `safeDbInsert` e `safeDbUpdate` removem em silêncio colunas inexistentes e tentam de novo, o que **perde dados sem avisar**.
- Funções duplicadas (`goToClientSite`, `toggleMobileMenu`).
- O telefone monta `55${dígitos}` sem tratar quem já digitou o DDI.

**Duplicação e fragilidade**

- Dois formulários de funcionário, duas cópias do schema, 7 arquivos CSS dos quais só `style.css` é usado.
- Funções globais em `window` e `onclick` inline com interpolação.
- `services.js` mistura UI, regra e persistência.
- Sem testes, build, lint nem `package.json`.
- CDN do supabase-js sem versão fixa e sem SRI.

**Desempenho e UX no celular**

- Polling de 12 s com 6 `SELECT *` sem filtro nem paginação, e re-render total que pode "pular" inputs durante a digitação. Isso pesa em bateria e dados móveis.
- Base64 enorme em colunas: o `SELECT *` traz tudo sempre, e o localStorage (cerca de 5 MB) estoura silenciosamente.
- Vídeos MP4 de WhatsApp sem compressão em `assets/portfolio` (5 arquivos), com `preload="auto"`.
- Imagens sem WebP ou `srcset`.
- Tabela de 7 colunas dentro de modal, ruim em tela pequena.
- `window.open` para contratos é bloqueado no iOS.
- Modais sem `role="dialog"` nem foco preso.
- Sem service worker.

## 4. O que reaproveitar e o que reescrever

**Reaproveitar**

- **Regras de negócio:**
  - Fluxo lead → ficha → cliente (busca por CPF/telefone) → entrada no caixa → lead removido.
  - Cálculo do DRE da obra: receita − diárias − insumos, margem %.
  - Saldo a receber = total − entrada.
  - Quitação rápida.
  - Formato `CLI-0001`, mas gerado por sequência no banco.
- **Dados e SQL:** colunas e tipos como ponto de partida; os 15 projetos de `seeds_portfolio_gdrive.sql`.
- **Código utilitário:** parser de mídia (`portfolio.js:24-97`), mensagens de WhatsApp e `prefillBudget`, máscara de CPF.
- **Estilos:** tokens de `variables.css` (carvalho `#8a4f26`, dourado `#c59b6d`, ébano `#0e0f13`, fundo `#f9f8f5`, Plus Jakarta Sans) e o tema claro do painel.
- **Assets:** `logo.svg`, `logo-icon.svg`, `favicon.svg`, `hero-bg.jpg`, fotos e vídeos do portfólio (recomprimir e renomear).

**Reescrever**

- Autenticação (Supabase Auth) e RLS por papel.
- Camada de dados: queries por tela, paginação e realtime pontual; remover `safeDb*`.
- Schema:
  - FKs e UNIQUE em `codigo_cliente`.
  - `DATE`/`TIMESTAMPTZ` e enums ou CHECK para status.
  - Tabelas relacionais para alocações e insumos.
  - Arquivos no Storage em vez de base64.
  - Valores em `NUMERIC` ou centavos de forma consistente.
- Storage com policies por papel; contratos em bucket privado com URL assinada.
- Escape de todo dado do usuário, sem `onclick` inline.
- Transação atômica lead → cliente → obra → caixa (função/RPC no banco).
- Módulos testáveis e componentizados.
- PWA real (service worker, ícones 192/512 e maskable).
- Portfólio com fonte única no banco, sem tombstones.

## 5. Enums e regras (exatamente como no código)

- **`leads.status`:** `Pendente de Contato` (default), `Em Negociação`, `Fechado`, `Perdido`. Filtro `Todos`.
- **`leads.tipo_servico`:**
  - Painéis & Revestimentos
  - Marcenaria Sob Medida
  - Cozinhas, Closets & Suítes
  - Ambientes Externos
  - Espaço Corporativo / Comercial
  - Outro Projeto Personalizado
- **`services.status`:** `A Iniciar` (default), `Em Produção / Oficina`, `Em Montagem / Obra`, `Concluído`. O código ainda trata o legado `Entregue`.
- **`forma_pagamento`:** default `Pix`; lista completa a confirmar em `admin.html`.
- **Número da obra exibido:** `#SRV-` + últimos 4 dígitos do id.
- **Worker:** `statusPagamento` = `Pendente` | `Pago`; `totalDiarias = valorDiaria × diasTrabalhados`.
- **`employees.status`:** `Ativo` | `Inativo`.
- **Cargos sugeridos:** Marceneiro Líder, Marceneiro de Bancada, Montador de Móveis, Ajudante Geral, Pintor / Laqueador, Gesseiro, Eletricista, Serralheiro, Acabador.
- **`transactions.tipo`:** `Entrada` | `Saída` (qualquer valor diferente de `Entrada` conta como saída).
- **Categorias do formulário manual:** Recebimento de Cliente, Madeiras & Insumos, Vernizes, Lixas & Parafusos, Frete & Transporte, Manutenção & Ferramentas, Custos Oficina.
- **Categorias geradas pelo código (fora da lista manual):** Entrada de Serviços, Quitação de Serviços, Insumos & Materiais.
- **Categorias de insumo da obra:** Madeiras e MDF, Ferragens, Tintas e Vernizes, Fitas de Borda e Colas, Frete e Transporte, Acessórios e Elétrica, Outros Insumos.
- **Portfólio, `categoria`:** MARCENARIA, MÓVEIS SOB MEDIDA, ÁREAS EXTERNAS, MADEIRA & REVESTIMENTOS, PROJETOS ESPECIAIS.
- **Portfólio, mídia:** `tipo_midia` = `foto` | `video`; `proporcao` = `vertical` | `horizontal`; título salvo em maiúsculas.
- **Destaques do portfólio:** fixos por id no código (principal 7; laterais 5, 2, 14).
- **Chaves de localStorage:** prefixo `marcenaria_`.

## 6. Perguntas para sua revisão

1. ~~Os dados do Supabase atual são reais?~~ Respondido: não são reais.
2. A senha padrão do admin é usada em algum outro lugar (e-mail, banco, WhatsApp)? Se sim, troque lá.
3. O repositório `ArthurFontes189/DK-` no GitHub é público?
4. Os objetivos da v2 no seu briefing ainda estão com `<ex.: ...>`. Preciso deles na Fase 2.
