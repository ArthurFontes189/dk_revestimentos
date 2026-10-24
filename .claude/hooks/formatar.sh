#!/usr/bin/env bash
# PostToolUse: formata automaticamente o arquivo que o Claude acabou de editar.
# Nunca falha a sessão: se o formatador não existir, apenas segue.
input="$(cat)"
file="$(printf '%s' "$input" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\(\([^"\\]\|\\.\)*\)".*/\1/p' | head -n1 | sed 's#\\\\#/#g')"

[ -z "$file" ] || [ ! -f "$file" ] && exit 0

case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.json|*.css|*.scss|*.md|*.html|*.yml|*.yaml)
    command -v npx >/dev/null && npx --no-install prettier --write "$file" >/dev/null 2>&1
    ;;
  *.py)
    if command -v ruff >/dev/null; then ruff format "$file" >/dev/null 2>&1
    elif command -v black >/dev/null; then black -q "$file" >/dev/null 2>&1; fi
    ;;
  *.go)
    command -v gofmt >/dev/null && gofmt -w "$file"
    ;;
  *.rs)
    command -v rustfmt >/dev/null && rustfmt "$file" >/dev/null 2>&1
    ;;
esac

exit 0
