---
name: projeto-supabase-compartilhado
description: O Supabase da DK é compartilhado com outro app do dono (notebooks); regras para não quebrar o outro app
metadata:
  node_type: memory
  type: project
  originSessionId: 98d58c13-01f2-4553-97e1-120ae622016e
  modified: 2026-10-27T20:29:02.954Z
---

O projeto Supabase `kkclcjejrvwxdlxknlbi` da DK Revestimentos v2 **também é usado por outro app do dono** (tabelas `notebooks`, `sources`, `chunks`, `profiles` e bucket `sources`, com dados). O dono escolheu reaproveitá-lo em 2026-10-27, mesmo após eu recomendar um projeto novo.

**Why:** o login (`auth.users`) é o mesmo e o plano gratuito pausa/limita; uma migration errada ou desligar o cadastro público quebraria o outro app.

**How to apply:** nunca alterar objetos do outro app, nunca mudar `default privileges` do schema `public`, nunca desligar o cadastro público. Cada migration da DK revoga o acesso herdado e concede só o necessário (padrão da migration `20261027120000_base`). Aplicar SQL no projeto real só com autorização explícita do dono, pelo SQL Editor (a migration ainda precisa de `supabase migration repair` antes de um `db push`). Ver [[git-push-em-lotes]].
