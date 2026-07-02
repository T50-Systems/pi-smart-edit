# smart_edit examples

Tool name:

- `smart_edit`

## Modes

- `replace_unique`
- `replace_between`
- `anchored_retry`

## Natural-language prompts

### 1) replace_unique

Prompt:

> Usa `smart_edit` en modo `replace_unique` para cambiar `const x = 1;` por `const x = 2;` en `src/file.ts`.

Params:

```json
{
  "path": "src/file.ts",
  "mode": "replace_unique",
  "oldText": "const x = 1;",
  "newText": "const x = 2;"
}
```

### 2) replace_between

Prompt:

> Usa `smart_edit` en modo `replace_between` para reemplazar el bloque entre `function demo() {` y `}` en `src/file.ts`.

Params:

```json
{
  "path": "src/file.ts",
  "mode": "replace_between",
  "startContent": "function demo() {",
  "endContent": "}",
  "lines": [
    "function demo() {",
    "  return 42;",
    "}"
  ]
}
```

### 3) anchored_retry

Prompt:

> Usa `smart_edit` en modo `anchored_retry` para rehacer un edit con anchors stale en `src/file.ts`.

Params:

```json
{
  "path": "src/file.ts",
  "mode": "anchored_retry",
  "op": "replace",
  "pos": "12#ABCD1234:old line",
  "lines": [
    "new line"
  ]
}
```
