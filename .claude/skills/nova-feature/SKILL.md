---
name: nova-feature
description: Use para implementar uma funcionalidade nova ou mudança relevante — fluxo explorar, planejar, testar, implementar, verificar e revisar.
argument-hint: '<descrição da feature>'
---

# Nova feature: $ARGUMENTS

1. **Explorar** — leia `docs/SPEC.md`, `docs/PLANO.md` e o código relacionado. Não edite nada ainda.
2. **Planejar** — escreva em `docs/PLANO.md`:
   - objetivo e critério de aceite;
   - arquivos que serão criados/alterados;
   - riscos e perguntas em aberto.
     Mostre o plano e **espere aprovação** se mexer em mais de ~3 arquivos.
3. **Testes primeiro** — escreva testes que descrevem o critério de aceite e confirme que falham.
4. **Implementar** — em passos pequenos, rodando os testes a cada passo.
5. **Verificar** — rode test, lint, typecheck e build (comandos no CLAUDE.md). Cole o resultado resumido.
6. **Revisar** — delegue ao subagente `revisor` e corrija o que for crítico.
7. **Fechar** — marque a tarefa no `docs/PLANO.md` e proponha o commit com `/commit`.
