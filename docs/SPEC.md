# Spec — DK Revestimentos v2

> Rascunho para aprovação. Base: `docs/DIAGNOSTICO-V1.md`. A v2 é um **projeto novo** (stack moderna, design premium), que mantém as funcionalidades e ideias da v1. `./legado` é só referência e inspiração.

## Problema

A DK Revestimentos (marcenaria e revestimentos sob medida) precisa de duas coisas:

1. **Captar mais clientes:** o site da v1 funciona, mas o visual não transmite o nível do trabalho e a conversão em orçamentos é fraca.
2. **Gerir o negócio num só lugar:** leads, clientes, obras (fichas de produção), equipe e caixa, principalmente pelo celular.

A v1 resolve isso, mas com arquitetura difícil de manter e insegura (ver diagnóstico, seção 0).

## Usuários

- **Visitante / cliente potencial:** chega pelo Instagram, Google ou WhatsApp, quer ver trabalhos reais e pedir orçamento rápido, quase sempre pelo celular.
- **Cliente da DK / admin (marceneiro):** acompanha leads, fecha vendas, controla obras, equipe e caixa. Uso diário, no celular e no computador. Algumas pessoas da empresa podem usar o painel, **todas com o mesmo acesso**: há um único usuário administrador, sem papéis nem permissões.
- **Funcionários / diaristas:** existem só como cadastro e custo de obra, sem acesso ao sistema.

> O projeto é desenvolvido por você para um cliente. A entrega inclui a conta de admin criada pelo cliente e orientação para trocar a senha.

## Princípios da v2

- **Nada que existe na v1 se perde** (tabela de paridade abaixo).
- **Design premium e voltado a conversão:** o site público existe para gerar leads.
- **Seguro por padrão:** autenticação real, RLS desde o primeiro dia, sem HTML montado com dados do usuário sem escape.
- **Responsivo de verdade: celular e computador têm a mesma qualidade.** O site público e o painel são projetados para os dois, com layouts próprios para cada (não é o layout do celular esticado, nem o do PC espremido). Instalável como PWA.

## Direção visual (decidida)

Mantém a identidade da v1 (madeira nobre, acabamento artesanal) e eleva o acabamento. Os valores abaixo são o ponto de partida do design system e podem ser refinados na implementação, sem mudar a direção.

**Mantido da v1:** paleta carvalho `#8a4f26`, dourado `#c59b6d`, ébano `#0e0f13`, fundo `#f9f8f5`; fonte Plus Jakarta Sans; tema claro no painel; raios 4/8/14/20.

**Melhorias:**

- **Contraste corrigido (medido):**
  - Dourado `#c59b6d` só sobre fundos escuros (7,56:1). Sobre claro dá 2,39:1 e reprova AA, então não é usado em texto claro.
  - Carvalho sobre `#f9f8f5` dá 6,13:1 e branco sobre carvalho 6,51:1 (ok).
  - O cinza `#64748b` dá 4,48:1 e será escurecido para passar AA.
- **Tipografia em duas vozes:** serifada de display para títulos do site público (a definir, ex.: Fraunces ou Cormorant Garamond) com Plus Jakarta Sans para texto e interface. O painel usa só a sans.
- **Escala tonal** de cada cor (50–900) como tokens CSS, em vez de cores soltas no código (a v1 tem `#0f172a` e `#64748b` espalhados em templates JS).
- **Site público com ritmo de seções:** hero cinematográfico sobre ébano com foto/vídeo de obra real; seções alternando ébano e creme; muito espaço em branco; fotos grandes; micro-animações discretas (respeitando `prefers-reduced-motion`).
- **Prova social e confiança:** depoimentos reais enviados pelo admin (item 13) e etapas do processo. Números de autoridade (obras entregues, anos de mercado) **só entram se o cliente informar valores reais**; não serão inventados.
- **Conversão:** CTA de orçamento fixo no celular (barra inferior), formulário curto em 2 passos e botão de WhatsApp flutuante discreto.
- **Painel nos dois formatos:**
  - **Celular:** navegação inferior, cards no lugar de tabelas largas, formulários em tela cheia (bottom sheet) e alvos de toque ≥ 44 px.
  - **Computador:** menu lateral fixo, tabelas densas com ordenação e filtros, painéis em várias colunas (ex.: lista de leads ao lado do detalhe), formulários em modal ou painel lateral, atalhos de teclado nas ações frequentes e uso aproveitando telas largas.
  - **Ambos:** modo escuro opcional.
- **Site público nos dois formatos:** no computador, hero em tela larga, grade do portfólio em várias colunas e depoimentos lado a lado; no celular, coluna única com CTA fixo.
- **Estados completos:** carregamento (skeleton), vazio, erro e sucesso em todas as telas.

## MVP — funcionalidades essenciais

### Site público (foco em captação)

1. **Home premium** (hero, serviços, processo, prova social, CTA) — aceite: Lighthouse mobile ≥ 90 em Desempenho e Acessibilidade; CTA de orçamento visível sem rolar no celular.
2. **Portfólio** com filtro por categoria, destaques e lightbox (foto, vídeo, YouTube/Shorts, PDF) — aceite: as 5 categorias da v1 funcionam; **todas as mídias vêm do Storage do Supabase** (nada de Google Drive); carregam otimizadas (ver "Mídia e otimização") com lazy loading.
3. **Pedido de orçamento** — aceite: o formulário valida os campos, grava o lead no banco e abre o WhatsApp com mensagem pré-formatada; se o banco falhar, o usuário vê erro claro (nunca falha silenciosa). Há também botão direto de WhatsApp em todas as páginas. O "projeto de interesse" do portfólio pré-preenche o orçamento.
4. **SEO e rastreio para anúncios no Instagram/Facebook** (meta tags, Open Graph, dados estruturados de negócio local, sitemap) — aceite:
   - Preview correto ao compartilhar no WhatsApp e nas redes.
   - **Meta Pixel** com eventos `PageView`, `ViewContent` (abrir projeto do portfólio), `Contact` (clicar no WhatsApp) e `Lead` (enviar orçamento).
   - Os eventos só disparam após o **aceite do banner de cookies** (LGPD) e ficam desligados enquanto o ID do pixel não estiver configurado.
   - Os parâmetros de campanha (`utm_source`, `utm_medium`, `utm_campaign`, `fbclid`) são capturados na chegada e gravados no lead, para o cliente ver **qual anúncio gerou cada lead** no CRM.
   - Páginas de destino (landing pages) leves e rápidas para os anúncios, com o mesmo formulário de orçamento.

### Painel admin (login obrigatório)

5. **Autenticação simples e real:** um único usuário admin no Supabase Auth (e-mail + senha), sem cadastro público e sem papéis. Credencial nunca fica no código — aceite: sem login não se lê nem se grava nenhum dado interno; a política de RLS é "autenticado = acesso total, anônimo = só ler portfólio e criar lead", validada por teste automatizado; há recuperação de senha por e-mail e logout.
6. **CRM de leads** com funil: Pendente de Contato → Em Negociação → Fechado / Perdido — aceite: filtro por status, contador de pendentes, botão de WhatsApp, e conversão em cliente + ficha em uma única operação atômica.
7. **Clientes** com código `CLI-XXXX` gerado no banco, único e sem repetição — aceite: nenhuma colisão mesmo após exclusões ou uso simultâneo; total contratado e total pago corretos (só entradas).
8. **Fichas de produção (obras)** com status: A Iniciar → Em Produção / Oficina → Em Montagem / Obra → Concluído — aceite: criar, editar, quitar saldo e concluir; editar o valor de entrada ajusta o caixa; DRE da obra (receita − diárias − insumos, lucro e margem) igual ao da v1.
9. **Equipe e diárias:** cadastro de funcionários e diaristas (cargo, PIX, diária padrão, ativo/inativo, contrato) e alocação por obra com status de pagamento — aceite: marcar "pago" e excluir insumo **persistem** no banco; contratos ficam em armazenamento privado, nunca em base64 no banco.
10. **Insumos por obra**, com opção de lançar no caixa — aceite: excluir o insumo remove o lançamento vinculado.
11. **Fluxo de caixa** (entradas e saídas) com filtro por período e categoria — aceite: saldo correto; datas em formato único; excluir um lançamento de entrada de obra reflete no valor recebido da obra.
12. **Gestão do portfólio** pelo admin (upload para o Storage, categoria, destaque, ordem) — aceite: a mídia enviada é otimizada automaticamente no upload e aparece no site público sem republicar o código e em todos os aparelhos; excluir um item remove também os arquivos do Storage.
13. **Depoimentos (aba no painel + seção no site)** — o admin anexa imagens de avaliações, normalmente prints de conversa de WhatsApp. Aceite:
    - Aba "Depoimentos" no painel: enviar uma ou várias imagens de uma vez, reordenar, ocultar/exibir e excluir (exclusão remove o arquivo do Storage).
    - Campos opcionais por item: primeiro nome do cliente e projeto/cidade (legenda).
    - Imagens passam pela mesma otimização do portfólio (WebP em várias larguras, blur placeholder); bucket `depoimentos` com leitura pública e escrita só autenticada.
    - Site público: seção de depoimentos em carrossel/grade com ampliação (lightbox), carregamento sob demanda e texto alternativo; **a seção só aparece se houver ao menos um depoimento visível**.
    - **Privacidade:** o painel avisa para ocultar telefone e dados pessoais antes de enviar e oferece uma ferramenta simples de tarja/recorte no upload. O cliente deve ter autorização de quem escreveu (responsabilidade do cliente da DK; o aviso fica no painel).
14. **PWA instalável** (manifest, ícones, service worker) — aceite: instala no Android e iOS; o site público carrega com cache offline básico.

## Mídia e otimização (decidido: tudo no Storage)

Google Drive deixa de existir na v2. Todas as mídias ficam no Supabase Storage.

**Buckets**

- `portfolio` — leitura pública, escrita só autenticada, com limite de tamanho e tipos MIME permitidos.
- `depoimentos` — leitura pública, escrita só autenticada, mesmas regras de limite e tipo do portfólio (somente imagens).
- `contratos` — privado, acesso por URL assinada de curta duração.

**Imagens**

- O painel redimensiona e converte no navegador antes do upload (o Supabase só transforma imagens no plano Pro, então não dependemos disso).
- Gera WebP em 3 larguras (ex.: 480, 960, 1920) mais uma miniatura borrada (blur placeholder) em cerca de 20 px.
- No site: `srcset`/`sizes`, `loading="lazy"`, `decoding="async"` e dimensões fixas para não haver salto de layout (CLS ≈ 0). A imagem do hero tem prioridade de carregamento.
- Nome de arquivo com hash do conteúdo e cache longo (`immutable`).

**Vídeos**

- Formato MP4 (H.264 + AAC), tamanho máximo por arquivo (ex.: 25 MB) e poster WebP obrigatório, gerado do primeiro quadro no upload.
- `preload="none"` (ou `metadata`); o vídeo só carrega quando o usuário toca ou ele entra na tela; no hero, uma versão curta e sem áudio.
- O navegador não transcodifica vídeo de forma confiável, então os 5 vídeos atuais serão comprimidos uma vez, offline, com `ffmpeg`, antes da importação. Se o cliente enviar um arquivo acima do limite, o painel recusa e orienta a comprimir ou usar YouTube.

**YouTube/Shorts:** mantidos como link (não é Drive); carregam com "lite embed" (miniatura + clique), sem baixar o player antes.

**PDF:** capa em WebP; o PDF abre sob demanda.

**Migração dos arquivos atuais:** script único que importa os 15 itens e as mídias de `legado/assets/portfolio`, otimizando e enviando ao bucket; nada é editado em `./legado`.

**Metas mensuráveis:** peso inicial da home ≤ 1 MB (sem vídeos); cada imagem de card ≤ 100 KB; LCP < 2,5 s em 4G.

## Paridade com a v1 (nada pode se perder)

| v1                                                         | v2                                                  |
| ---------------------------------------------------------- | --------------------------------------------------- |
| Site com portfólio (foto, YouTube/Shorts, MP4, Drive, PDF) | Itens 2 e 12. Itens do Drive migram para o Storage. |
| Orçamento via WhatsApp + lead no banco                     | Item 3                                              |
| Funil de leads (4 status)                                  | Item 6                                              |
| Cadastro de clientes `CLI-XXXX`                            | Item 7                                              |
| Fichas de produção (4 status), DRE, quitação rápida        | Item 8                                              |
| Funcionários e diaristas, contratos                        | Item 9                                              |
| Insumos por obra                                           | Item 10                                             |
| Fluxo de caixa                                             | Item 11                                             |
| Painel admin                                               | Itens 5 a 12                                        |
| PWA                                                        | Item 14                                             |
| (novo) Depoimentos com anexo de imagens                    | Item 13                                             |
| 15 projetos do portfólio e seus textos                     | Reimportados como seed                              |

## O que muda (corrige a v1)

- Login real no lugar do login fixo; RLS em todas as tabelas; Storage com política por papel.
- Schema relacional com FKs, UNIQUE, enums/CHECK e datas tipadas; sem JSONB solto para equipe e insumos.
- Mídias e contratos no Storage; fim do base64 no banco.
- Sem polling de 12 s; dados por tela, com paginação e realtime só onde faz sentido.
- Todo texto do usuário é escapado (sem XSS).
- Categorias de caixa unificadas (manuais e automáticas).
- Campo de mensagem próprio no lead (hoje vai concatenado em `bairro`), mais colunas de origem (`utm_*`, `fbclid`, página de entrada).
- Campo CPF no cadastro de cliente (hoje só na ficha).

## Fora do escopo (primeira entrega)

- Migração de dados da v1 (não há dados reais; confirmado).
- Pagamento online, emissão de nota fiscal, contratos com assinatura digital.
- Múltiplos usuários, papéis e permissões (um único admin compartilhado basta).
- Acesso de funcionários ao sistema (app para equipe).
- App nativo (só PWA).
- Multiempresa (multi-tenant).
- Blog, loja virtual e chat ao vivo.

## Requisitos não funcionais

- **Desempenho:** LCP < 2,5 s em 4G no site público; painel utilizável em celular intermediário; imagens e vídeos otimizados. Lighthouse medido em **mobile e desktop** (meta ≥ 90 nos dois).
- **Responsividade:** testes automatizados (Playwright) nas larguras 360, 768, 1280 e 1920 px, sem rolagem horizontal e sem elementos cortados; fluxo de orçamento e login testados no celular e no computador.
- **Segurança:**
  - RLS em todas as tabelas, com teste automatizado das políticas.
  - Sem `service_role` no front.
  - Segredos só em variáveis de ambiente, com `.env.example`.
  - Contratos em bucket privado com URL assinada.
- **Privacidade (LGPD):** banner de consentimento de cookies, página de política de privacidade, e o formulário informa o uso dos dados do lead. Nenhum rastreador carrega antes do aceite.
- **Acessibilidade:** contraste AA, navegação por teclado, modais com foco preso e `role="dialog"`.
- **Qualidade:** TypeScript estrito, lint, formatador e testes (unitários nas regras de negócio, mais fluxo ponta a ponta do orçamento e do login).
- **Hospedagem/orçamento:** baixo custo (plano gratuito ou barato de hospedagem + Supabase). Stack e deploy definidos na Fase 3.
- **Idioma:** interface em pt-BR.

## Integrações externas

- **Supabase** (Postgres, Auth, Storage, Realtime) — manter, como pedido.
- **WhatsApp** (`wa.me`) — envio do orçamento e contato direto. Número fictício até o cliente informar o real; sempre lido de variável de ambiente, nunca fixo no código.
- **YouTube** — vídeos e Shorts do portfólio, só como link (lite embed).
- **Meta Pixel** (Instagram/Facebook Ads) — medir e otimizar anúncios; ID por variável de ambiente, fictício/vazio até o cliente criar a conta de anúncios.
- **Google Analytics 4** — opcional, mesma regra de ID e consentimento; ativado só se o cliente quiser.
- **Meta Conversions API** (envio do evento `Lead` pelo servidor) — recomendada porque bloqueadores e o iOS derrubam parte do pixel no navegador; entra na primeira entrega só se couber, senão na seguinte (ver Fase 3).

## Perguntas em aberto

1. ~~Identidade visual~~ — decidido: manter a identidade e melhorar o acabamento (seção "Direção visual").
2. ~~Usuários do painel~~ — decidido: um único usuário admin compartilhado, sem papéis.
3. ~~Google Drive no portfólio~~ — decidido: tudo no Storage, otimizado (seção "Mídia e otimização").
4. ~~Domínio e WhatsApp~~ — decidido: sem domínio por ora (usa o subdomínio da hospedagem) e WhatsApp fictício. Ambos vêm de variáveis de ambiente (`NEXT_PUBLIC_SITE_URL` e número de WhatsApp, nomes finais na Fase 3), então trocar pelos reais não exige mexer no código. **Pendente de produção:** definir domínio e número real antes de divulgar (afeta SEO, Open Graph, sitemap e os links do WhatsApp).
5. ~~Medição de leads~~ — decidido: Meta Pixel como principal (anúncios no Instagram/Facebook), GA4 opcional. Pendente do cliente: conta de anúncios e ID do pixel.
6. ~~Conteúdo do site~~ — decidido: os textos serão **recriados do zero** em pt-BR (copy voltada a conversão, sem afirmações factuais inventadas); da v1 só se aproveitam **imagens e vídeos**. Depoimentos via aba do painel (item 13). O cliente revisa e aprova os textos antes de publicar.
7. ~~Banco~~ — decidido: **projeto Supabase novo, do zero**. Nada do projeto da v1 é reaproveitado (schema, políticas, buckets, chaves). O projeto antigo fica de fora e deve ser desativado ou apagado por você quando quiser, já que a chave pública dele está no histórico do GitHub. Pendente: criar o projeto novo (conta Supabase) na Fase 4; sem ele, só consigo preparar as migrations e rodar testes localmente.

Todas as perguntas em aberto estão respondidas. Falta apenas a sua aprovação da spec.
