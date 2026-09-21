# Proposta — C07: Frontend Monaco Editor + Modos de Entrada de Código

> **Change ID:** c07-frontend-editor-input-modes
> **Tamanho:** Médio | **Complexidade:** Média | **Risco:** Médio
> **Depende de:** C06 (design system + tipos TypeScript)
> **Bloqueia:** C09, C10

---

## 1. Escopo Funcional

Implementar o Monaco Editor integrado à interface com suporte aos três modos de entrada de código: inserção manual, upload de arquivo e URL de PR/MR. Também implementa o hook `useEditor` e o componente `Editor/` reutilizável por C09 e C10.

### Telas Stitch de referência

- **"Review Playground & Alertas Inline"** — tela principal com Monaco Editor e abas de modo de entrada
- **"Ingestão de PR/MR & Diffs Side-by-Side"** — aba de URL + visualizador de diff

### O que entra nesta mudança

| Artefato | Descrição |
|----------|-----------|
| `frontend/components/Editor/CodeEditor.tsx` | Monaco Editor com syntax highlighting; wrapping de `@monaco-editor/react` |
| `frontend/components/Editor/InputTabs.tsx` | Abas `[Código Manual]` `[Upload Arquivo]` `[URL PR/MR]` conforme Stitch |
| `frontend/components/Editor/FileUpload.tsx` | Input de arquivo; lê via FileReader API; suporta extensões de `docs/spec.md §Compatibilidade` |
| `frontend/components/Editor/PrUrlInput.tsx` | Input de URL de PR/MR com validação client-side via `lib/pr-url-validator.ts` |
| `frontend/components/DiffViewer/DiffViewer.tsx` | `react-diff-viewer-continued` em modo side-by-side e unified; toggle sem reload |
| `frontend/hooks/useEditor.ts` | Estado do editor: `content`, `language`, `mode`; métodos `setContent`, `applyEdit`, `undo` |

### Comportamento das abas (conforme Stitch)

```
[Código Manual] [Upload Arquivo] [URL PR/MR]
  ─────────────────────────────────────────
  Aba ativa: background #161F30, borda-top 2px #F97316
  Aba inativa: background #111827, texto #9CA3AF
```

### Upload de arquivo — extensões suportadas

`.py .js .ts .jsx .tsx .java .go .php .rb`

### URL de PR/MR — validação

- Regex GitHub: `https://github.com/{owner}/{repo}/pull/{number}`
- Regex GitLab: `https://gitlab.com/{group}/{repo}/-/merge_requests/{number}`
- Erro antes do envio ao backend (CA-RF01-03)

### O que NÃO entra

- Gutter icons e highlighting de alertas (pertence ao C09)
- Chamada ao backend para análise (pertence ao C11)
- Painel de alertas (pertence ao C08)

---

## 2. Dependências

| Tipo | Item | Versão |
|------|------|--------|
| Editor | `@monaco-editor/react` | 4.x |
| Diff | `react-diff-viewer-continued` | 4.x |
| Testes | Jest, React Testing Library, @testing-library/user-event | latest |

---

## 3. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Monaco bundle size (~2MB) afeta performance de carregamento | Média | Médio | Lazy load com `next/dynamic` + loading skeleton |
| Monaco incompatível com SSR do Next.js | Alta | Alto | Usar `next/dynamic` com `ssr: false` (ADR-04) |
| FileReader API não disponível em SSR | Alta | Médio | Componente de upload com `use client` |
| `react-diff-viewer-continued` não renderiza SSR | Média | Médio | `next/dynamic` com `ssr: false` |

---

## 4. Execução de Linter

```bash
cd frontend
npm run lint
npx tsc --noEmit
```

---

## 5. Testes Unitários

```typescript
// frontend/__tests__/components/InputTabs.test.tsx
test('renders all three input tabs')
test('active tab shows correct indicator')
test('switching tabs preserves editor content')  // CA-RF01-01

// frontend/__tests__/components/PrUrlInput.test.tsx
test('valid GitHub URL does not show error')
test('invalid URL shows validation message')  // CT05
test('empty URL does not trigger API call')

// frontend/__tests__/hooks/useEditor.test.ts
test('setContent updates editor state')
test('language auto-detected from file extension')
```

---

## 6. Testes de Integração

```typescript
// frontend/__tests__/integration/FileUpload.test.tsx
test('uploading .py file populates editor')    // CA-RF01-02
test('uploading unsupported extension shows error')  // CA-RF01-02

// frontend/__tests__/integration/DiffViewer.test.tsx
test('side-by-side mode renders both panes')   // CA-RF07-01
test('switching to unified mode does not lose alerts')  // CA-RF07-02
```

---

## 7. Testes E2E

```
CT08: colar arquivo com 2.000 linhas → editor permanece responsivo
- Verificar manualmente que não há freeze com DevTools Performance
```

---

## 8. Definition of Done

- [ ] Monaco Editor renderiza código com syntax highlighting nos modos manual e upload
- [ ] Três abas de entrada funcionam sem reload de página (CA-RF01-01)
- [ ] Upload rejeita extensões não suportadas com mensagem descritiva (CA-RF01-02)
- [ ] URL de PR inválida exibe erro client-side antes de qualquer envio (CT05, CA-RF01-03)
- [ ] DiffViewer alterna entre side-by-side e unified sem perda de estado
- [ ] Monaco carregado via `next/dynamic` sem erro de SSR
- [ ] Exit 0: `npm run lint`, `npx tsc --noEmit`, `npm test`

---

## 9. Referências

- Stitch telas: "Review Playground & Alertas Inline", "Ingestão de PR/MR & Diffs Side-by-Side"
- `docs/spec.md §3 RF01` — Modalidades de entrada
- `docs/spec.md §3 RF07` — Visualizador de diffs
- `docs/architecture.md ADR-04` — Monaco Editor como editor principal
- `docs/spec.md §Compatibilidade` — Extensões de arquivo suportadas
