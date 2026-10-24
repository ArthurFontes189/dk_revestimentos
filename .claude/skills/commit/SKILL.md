---
name: commit
description: Use para criar commits — revisa o diff, separa em commits lógicos e escreve mensagens no padrão Conventional Commits.
disable-model-invocation: true
allowed-tools: Bash(git status) Bash(git diff:*) Bash(git add:*) Bash(git commit:*) Bash(git log:*)
---

# Commit

1. Rode `git status` e `git diff` (inclua `--staged`).
2. Confira que não há segredos, arquivos de debug ou mudanças sem relação com a tarefa.
3. Se houver mudanças de assuntos diferentes, separe em mais de um commit.
4. Mensagem no formato Conventional Commits, em português:
   ```
   <tipo>(<escopo opcional>): <resumo no imperativo, até 72 caracteres>

   <corpo: o porquê da mudança, se não for óbvio>
   ```
   Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `style`, `ci`.
5. Não faça `git push` — pergunte ao usuário.
