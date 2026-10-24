---
name: corrigir-bug
description: Use quando houver bug, erro, teste falhando ou comportamento inesperado — depuração sistemática antes de qualquer correção.
argument-hint: '<sintoma ou mensagem de erro>'
---

# Corrigir bug: $ARGUMENTS

Regra de ouro: **nenhuma correção sem causa raiz confirmada.**

1. **Reproduzir** — encontre os passos mínimos que reproduzem o problema.
2. **Teste que falha** — escreva um teste que captura o bug.
3. **Investigar** — leia o stack trace inteiro, o código envolvido e `git log` recente dos arquivos.
4. **Hipótese** — formule UMA hipótese e teste-a (log, breakpoint, teste isolado). Se falhar, descarte e formule outra.
5. **Corrigir** — mude o mínimo necessário na causa, não no sintoma.
6. **Verificar** — o teste novo passa e toda a suíte continua verde.
7. **Registrar** — se o bug veio de algo não óbvio, adicione uma linha em "Armadilhas conhecidas" no CLAUDE.md.

Se após 3 hipóteses não houver progresso, pare e resuma ao usuário o que foi descartado.
