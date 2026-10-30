---
name: git-push-em-lotes
description: 'O dono quer desenvolver localmente e só enviar ao GitHub depois de um bloco de trabalho, quando ele mandar'
metadata:
  node_type: memory
  type: feedback
  originSessionId: 98d58c13-01f2-4553-97e1-120ae622016e
  modified: 2026-10-27T20:28:21.014Z
---

Commitar localmente em passos lógicos, mas **não dar `git push` a cada mudança**. Só enviar ao GitHub quando o usuário disser que pode ("subimos para o git").

**Why:** em 2026-10-27 o usuário pediu para abrir o projeto localmente e subir ao git "depois de certo tempo de desenvolvimento". Até então eu enviava a cada etapa, e cada push dispara CI e deploy no GitHub Pages (site público).

**How to apply:** rodar site (porta 4321) e painel (porta 5174) localmente para conferir o trabalho; commitar localmente; antes de qualquer push, esperar o aval do usuário. Rodar `node node_modules/astro/bin/astro.mjs` e `vite` direto (o `pnpm.cmd` global desta máquina falha dentro de scripts). Ver [[projeto-supabase-compartilhado]].
