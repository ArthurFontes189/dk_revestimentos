---
name: estado-e6-e8-e-pendencias
description: 'Onde o projeto DK parou (E6 a E8 prontas e testadas, migrations ainda não aplicadas no Supabase real) e o que falta fazer'
metadata:
  node_type: memory
  type: project
  originSessionId: 853bb89d-e795-44fb-97ff-26bb0b5d8597
  modified: 2026-10-30T18:51:25.856Z
---

Em 2026-10-31: E6 (obras e caixa), E7 (equipe, diárias, insumos) e E8 (painel de caixa) estão implementadas, commitadas, enviadas ao `main` e com o CI verde (verificar, e2e e pgTAP no job `banco`). Último commit local de docs: `70b8bbf` (ainda não enviado).

**Pendência principal:** aplicar no Supabase real, à mão no SQL Editor (cada uma em `begin; … commit;`, nesta ordem): `20261029120000_obras_caixa`, `20261030120000_equipe_insumos`, `20261031120000_caixa`. Eu não tenho acesso ao banco real. O usuário cola o resultado da consulta de verificação (esperado: 5 tabelas, 4 rpcs, 1 trigger `transactions_protege`, 1 bucket `contratos` privado, `chunks` do outro app = 9). Só depois disso acrescentar as 3 versões ao `supabase migration repair` no `CLAUDE.md`.

**Próximo passo no plano:** E9 (PWA, qualidade, produção; inclui migrar para Cloudflare Pages antes dos anúncios pagos). Falta escrever o desenho em `docs/PLANO.md` e esperar aprovação (o `CLAUDE.md` exige para tarefas com mais de 3 arquivos).

**Why:** o site publicado já tem as telas Obras, Equipe e Caixa, mas elas só funcionam de verdade quando o banco real tiver as tabelas.

**How to apply:** ao retomar, perguntar se as migrations foram aplicadas; se sim, pedir o resultado da verificação e atualizar `CLAUDE.md` e `docs/PLANO.md`; depois propor o desenho da E9. Decisões já tomadas por delegação do usuário (revisáveis): diária paga sempre lança saída no caixa; menu do celular com item "Mais"; diária e insumo somente leitura no caixa; entrada manual só em `Outras entradas`; período padrão do caixa é o mês atual. Veja [[git-push-em-lotes]] e [[projeto-supabase-compartilhado]].

Armadilhas de ambiente nesta máquina: `pnpm typecheck` e `pnpm build` da raiz falham pelo `pnpm.cmd` quebrado (conferir com `tsc --noEmit` por pacote); heredoc com apóstrofos no Bash quebra, então usar a ferramenta Write; `gh` não está instalado (usar `curl` na API do GitHub para ver o CI).
