---
name: iniciar-projeto
description: Use ao começar um projeto do zero — entrevista o usuário, escreve docs/SPEC.md, escolhe a stack, preenche o CLAUDE.md e cria o esqueleto do repositório.
disable-model-invocation: true
---

# Iniciar projeto do zero

Siga as etapas em ordem. Não escreva código de produto antes da etapa 5.

## 1. Entrevista (uma pergunta por vez)

Pergunte, esperando cada resposta:

- Qual problema o projeto resolve e para quem?
- Quais são as 3–5 funcionalidades essenciais do MVP? O que fica FORA do MVP?
- Web, mobile, API, CLI, desktop?
- Restrições: prazo, orçamento de hospedagem, stack que o usuário já domina, integrações obrigatórias.

## 2. Spec

Preencha `docs/SPEC.md` usando o modelo que já está no arquivo. Mostre ao usuário e peça aprovação.

## 3. Stack

Proponha 2 opções de stack com prós e contras curtos e uma recomendação. Prefira tecnologias estáveis e populares.
Registre a decisão em `docs/decisoes/0001-stack.md` (formato ADR: contexto, decisão, consequências).

## 4. CLAUDE.md

Substitua todos os `<placeholders>` do `CLAUDE.md` com a stack, comandos reais e estrutura de pastas.
Atualize `.claude/settings.json` (permissões `allow`) com os comandos reais da stack.

## 5. Esqueleto

- Inicialize o projeto com o gerador oficial da stack (ex.: `create-next-app`, `uv init`).
- Configure lint, formatador, typecheck e framework de testes.
- Crie um teste trivial e garanta que `test`, `lint` e `build` passam.
- Crie `.env.example` com as variáveis necessárias.
- Faça o primeiro commit: `chore: esqueleto inicial do projeto`.

## 6. Plano

Quebre o MVP em tarefas pequenas em `docs/PLANO.md` (checklist ordenada) e pergunte por qual começar.
