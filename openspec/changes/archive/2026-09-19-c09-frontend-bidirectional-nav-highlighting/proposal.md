# Proposta — C09: Frontend Navegação Bidirecional Editor ↔ Painel e Highlighting

> **Change ID:** c09-frontend-bidirectional-nav-highlighting
> **Tamanho:** Médio | **Complexidade:** Média | **Risco:** Médio
> **Depende de:** C07 (Monaco Editor + useEditor), C08 (Alert Panel + useAlerts)
> **Bloqueia:** C10

---

## 1. Escopo Funcional

Implementar a sincronização bidirecional entre o Monaco Editor e o painel de alertas, incluindo gutter icons por severidade, highlight temporário de linhas e scroll sincronizado. Toda operação deve ocorrer em < 300ms (RF03, CA-RF03-01).

### Tela Stitch de referência

- **"Review Playground & Alertas Inline"** — gutter markers coloridos, linha destacada com fundo semitransparente, card com estado `active`

### O que entra nesta mudança

| Artefato | Descrição |
|----------|-----------|
| `frontend/hooks/useEditorHighlight.ts` | Gerencia gutter icons e highlight de linhas no Monaco; `highlightLine(lineStart, lineEnd, severity)`, `clearHighlight(alertId)` |
| `frontend/components/Editor/GutterMarkers.tsx` | Configura decorações do Monaco para gutter icons e highlight de fundo por severidade |
| Painel → Editor | Ao clicar num card: smooth scroll para `line_start`, highlight 2–3s, card = `active` |
| Editor → Painel | Ao clicar num gutter icon: scroll do painel até o card correspondente, card = `active` |
| Mapeamento de cores (RF08) | CRITICAL `rgba(239,68,68,0.15)`, HIGH `rgba(249,115,22,0.15)`, MEDIUM `rgba(234,179,8,0.12)`, LOW `rgba(59,130,246,0.10)` |

### Comportamento esperado (RF03)

```
[Usuário clica em card CRITICAL no painel]
  → Monaco.revealLineInCenterIfOutsideViewport(line_start)
  → Monaco.deltaDecorations([{range, options: {className: 'highlight-critical'}}])
  → setTimeout(clearDecoration, 2500)
  → card.state = 'active'

[Usuário clica em gutter icon no Monaco]
  → alertPanel.scrollTo(cardId)
  → card.state = 'active'

Latência total: < 300ms (CA-RF03-01)
```

### O que NÃO entra

- Aplicação de correções (pertence ao C10)
- Dados reais do SSE (pertence ao C11)

---

## 2. Dependências

| Tipo | Item | Notas |
|------|------|-------|
| Monaco API | `editor.deltaDecorations`, `editor.revealLineInCenterIfOutsideViewport` | via `@monaco-editor/react` ref |
| State | `useAlerts` de C08 | para `activeAlertId` |
| State | `useEditor` de C07 | para acesso ao Monaco instance |
| Testes | Jest, `@testing-library/user-event`, `vitest` | latest |

---

## 3. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Monaco instance não disponível antes do primeiro render | Alta | Médio | Guard com `if (!editorRef.current) return` |
| `deltaDecorations` acumular decorações antigas | Média | Médio | Manter array de IDs de decorações ativas; limpar antes de adicionar novas |
| Highlight de 2–3s conflitar com ação do usuário | Baixa | Baixo | Cancelar `setTimeout` pendente ao mudar `activeAlertId` |
| Scroll bidirecional > 300ms em arquivos grandes | Baixa | Médio | Usar `requestAnimationFrame` para operações de DOM; testar CT08 |

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
// frontend/__tests__/hooks/useEditorHighlight.test.ts
test('highlightLine adds decoration with correct severity color')  // CA-RF08-01, CA-RF08-02
test('highlight is removed after 2-3 seconds')                     // CA-RF03-03
test('only one card is active at a time')                          // CA-RF03-05
test('clearHighlight removes decoration for resolved alert')       // CA-RF08-03
test('filter change removes gutter icons for hidden severity')     // CA-RF08-04
```

---

## 6. Testes de Integração

```typescript
// frontend/__tests__/integration/BidirectionalNav.test.tsx
test('clicking alert card triggers editor scroll')       // CA-RF03-02
test('clicking gutter icon highlights corresponding card')  // CA-RF03-04
test('navigation latency < 300ms')                       // CA-RF03-01 (performance.now)
test('disabling severity filter hides gutter icons')     // CT06, CA-RF08-04
```

---

## 7. Testes E2E

```
CT06 (parte 2): desativar MEDIUM → gutter icons MEDIUM desaparecem no editor
CT08: arquivo 2.000 linhas → scroll bidirecional sem freeze (RNF04)
```

---

## 8. Definition of Done

- [x] Clicar em card → Monaco scrolls suavemente e destaca linha em < 300ms
- [x] Highlight dura entre 2 e 3 segundos e é removido automaticamente (CA-RF03-03)
- [x] Clicar em gutter icon → painel scrolla até o card (CA-RF03-04)
- [x] Apenas um card/linha ativo por vez (CA-RF03-05)
- [x] Gutter icons com cores corretas por severidade (CA-RF08-01, CA-RF08-02)
- [x] Filtro de severidade oculta gutter icons correspondentes (CA-RF08-04)
- [x] Exit 0: `npm run lint`, `npx tsc --noEmit`, `npm test`
- [x] CT08: smoke ~2000 linhas em `ct08-large.test.ts`; checklist manual browser (gutters + clique card sem freeze) antes do PR

---

## 9. Referências

- Stitch tela: "Review Playground & Alertas Inline"
- `docs/spec.md §3 RF03` — Navegação bidirecional
- `docs/spec.md §3 RF08` — Destaque visual inline com mapeamento de cores
- `docs/prd.md §3 RF03` — Critério de 300ms
