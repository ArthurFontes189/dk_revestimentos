---
paths:
  - 'tests/**'
  - '**/*.test.*'
  - '**/*.spec.*'
  - '**/test_*.py'
---

# Regras de testes

- Toda feature nova ou bug corrigido vem com teste.
- Para bugs: escreva primeiro o teste que falha, depois a correção.
- Um teste verifica um comportamento; nome no formato "deve <resultado> quando <condição>".
- Teste comportamento público, não detalhes de implementação.
- Mocks só nas fronteiras (rede, banco, relógio). Nunca mocke o que está sendo testado.
- Nunca use `.skip`/`xfail` para esconder falha sem avisar o usuário.
