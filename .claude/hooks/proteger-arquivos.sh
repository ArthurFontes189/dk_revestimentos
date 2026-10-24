#!/usr/bin/env bash
# PreToolUse: bloqueia edição de arquivos sensíveis.
# Exit code 2 = bloqueia a ação e devolve a mensagem (stderr) ao Claude.
# Não depende de python/jq: extrai file_path do JSON com sed.
set -euo pipefail

input="$(cat)"
file="$(printf '%s' "$input" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\(\([^"\\]\|\\.\)*\)".*/\1/p' | head -n1 | sed 's#\\\\#/#g')"

[ -z "$file" ] && exit 0

# .env.example é versionado e deve poder ser editado
case "$file" in
  *.env.example) exit 0 ;;
esac

case "$file" in
  *.env|*.env.*|*/secrets/*|*.pem|*.key|*package-lock.json|*pnpm-lock.yaml|*yarn.lock|*poetry.lock|*/.git/*)
    echo "Bloqueado pelo hook: '$file' é protegido (segredo ou lockfile). Peça ao usuário para alterar manualmente." >&2
    exit 2
    ;;
esac

exit 0
