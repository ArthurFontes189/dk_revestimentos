# Regras de segurança

- Segredos só via variáveis de ambiente; documente-as em `.env.example` (sem valores reais).
- Nunca logue tokens, senhas, dados pessoais ou corpos de requisição completos.
- Queries de banco sempre parametrizadas — nunca concatenação de string.
- Escape/sanitize tudo que vem do usuário antes de renderizar.
- Autorização checada no servidor em toda rota protegida, não só no front.
- Ao adicionar dependência: prefira pacotes mantidos e populares, e avise o usuário.
