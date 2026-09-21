# Proposta — C11: Frontend SSE Integration, Fluxo Ponta-a-Ponta e Tratamento de Erros

> **Change ID:** c11-frontend-sse-integration-error-handling
> **Tamanho:** Médio | **Complexidade:** Média | **Risco:** Médio
> **Depende de:** C05 (backend SSE endpoint), C10 (apply fix), C08 (Alert Panel)
> **Bloqueia:** — (última mudança do MVP frontend)

---

## 1. Escopo Funcional

Implementar o hook `useSSE` para consumir o streaming `POST /api/analyze` e conectar todos os componentes do frontend em um fluxo ponta-a-ponta funcional. Inclui tratamento de erros (timeout, parsing inválido, conectividade), toast de erro com botão de retry e banner de offline.

### Tela Stitch de referência

- **"Review Playground & Alertas Inline"** — botão "Analisar", skeleton loader, toast de erro
- **"Relatório & Code Health Score"** — tela final com score e alertas populados

### O que entra nesta mudança

| Artefato | Descrição |
|----------|-----------|
| `frontend/hooks/useSSE.ts` | `useSSE(url, body)` — consume SSE via `EventSource` (ou `fetch` + `ReadableStream`); emite callbacks `onAlert`, `onScore`, `onDone`, `onError` |
| `frontend/app/page.tsx` | Página principal: orquestra Editor, AlertPanel, HealthDashboard, botão "Analisar" |
| Skeleton loader | Exibido em ≤ 200ms após clique em "Analisar" (RNF02) |
| Toast de erro | Componente com botão "Tentar Novamente" para timeout e parsing inválido (CT04, RF10) |
| Banner offline | `navigator.onLine` falso → banner informativo (CA-RF10-04) |
| Retry | Botão reenvia a mesma requisição sem reinserir código (CA-RF10-03) |
| Indicadores de loading | Skeleton para AlertPanel, spinner no botão "Analisar" |

### Fluxo SSE completo (spec.md §6 happy path)

```
[Clique em "Analisar"]
  → skeleton loader em ≤ 200ms (RNF02)
  → POST /api/analyze (fetch + ReadableStream)
  
[Backend emite event: alert]
  → useAlerts.addAlert(parsedAlert)
  → useEditorHighlight.highlightLine(alert)
  → AlertCard renderizado no painel
  
[Backend emite event: score]
  → HealthDashboard.updateScore(scoreData)
  
[Backend emite event: done]
  → loading = false; skeleton removido
  
[Timeout > 30s ou erro de rede]
  → Toast com botão "Tentar Novamente" (CT04)
```

### Tratamento de erros (RF10, RNF05)

| Cenário | Comportamento |
|---------|--------------|
| Timeout > 30s | Toast de erro + botão retry (CT04) |
| Parsing inválido do SSE | Toast de erro; editor preservado (CA-RF10-02) |
| `navigator.onLine = false` | Banner informativo permanente até restaurar conexão |
| Resposta vazia (sem alertas) | "Nenhum problema encontrado" + score 100 (CT03) |

### O que NÃO entra

- Nenhuma nova lógica de negócio (toda lógica está em C03–C10)

---

## 2. Dependências

| Tipo | Item | Notas |
|------|------|-------|
| Backend | C05 `POST /api/analyze` SSE endpoint | deve estar rodando |
| Frontend | C10 completo | `applyFix`, `useAlerts`, `useEditorHighlight` |
| Testes | Jest, MSW (Mock Service Worker) ou `jest-sse-mock` | mock do SSE server |

---

## 3. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| `EventSource` não suporta `POST` — usar `fetch` + `ReadableStream` | Alta (certeza) | Alto | Usar `fetch` com `ReadableStream` em vez de `EventSource` para `POST /api/analyze` |
| CORS bloqueando SSE do backend local | Média | Médio | CORS configurado no C02 para `localhost:3000` |
| Parsing de SSE line-by-line frágil | Média | Médio | Usar parser de SSE robusto ou lib leve |
| TTFA > 1.500ms | Baixa | Alto | Medir com DevTools em staging; otimizar se necessário |

---

## 4. Execução de Linter

```bash
cd frontend
npm run lint
npx tsc --noEmit
npm run build   # validar bundle sem API Keys (RNF03)
```

```bash
# Auditoria de segurança do bundle (RNF03)
grep -r "GEMINI_API_KEY\|GITHUB_TOKEN\|GITLAB_TOKEN" .next/
# deve retornar vazio
```

---

## 5. Testes Unitários

```typescript
// frontend/__tests__/hooks/useSSE.test.ts
test('onAlert callback called for each alert event')
test('onScore callback called with score data')
test('onDone callback called at stream end')
test('onError called on timeout (> 30s)')           // CT04, CA-RF10-01
test('offline banner shown when navigator.onLine false')  // CA-RF10-04
test('retry re-sends request without user input')    // CA-RF10-03
```

---

## 6. Testes de Integração

```typescript
// frontend/__tests__/integration/AnalyzeFlow.test.tsx
// Mock do backend com MSW

test('skeleton loader appears within 200ms of click')         // RNF02
test('alert cards appear as SSE events arrive')
test('score updates when score event received')
test('done event removes loading state')
test('CT01: SQL injection code produces CRITICAL alert card') // CT01
test('CT02: hardcoded secret produces CRITICAL alert card')   // CT02
test('CT03: clean code shows empty panel and score 100')     // CT03
test('CT04: timeout shows error toast with retry button')     // CT04
test('retry button re-sends analyze request')                 // CA-RF10-03
```

---

## 7. Testes E2E

```
CT01: SQL Injection → alerta CRITICAL
CT02: Segredo hardcoded → alerta CRITICAL
CT03: Código limpo → painel vazio, score 100
CT04: Timeout simulado → toast com "Tentar Novamente"
CT05: URL inválida → validação antes do envio
CT06: Filtro de severidade → oculta cards e gutter icons
CT07: Aplicar correção + Ctrl+Z
CT08: Arquivo 2.000 linhas → responsivo

Todos os 8 CTs do docs/spec.md §7 devem passar nesta mudança.
```

---

## 8. Definition of Done

- [x] Fluxo completo ponta-a-ponta funciona: colar → analisar → alertas → aplicar correção → undo
- [ ] TTFA ≤ 1.500ms medido em staging (RNF02)
- [x] Skeleton loader visível em ≤ 200ms após clique (RNF02)
- [ ] Todos os 8 CTs (CT01–CT08) passando em staging
- [x] Bundle Next.js sem API Keys (auditoria `grep`, RNF03)
- [x] Exit 0: `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`
- [ ] Exit 0: backend `ruff`, `mypy`, `pytest --cov=src/core --cov-fail-under=80`

---

## 9. Referências

- `docs/spec.md §6` — Fluxo ponta-a-ponta completo (happy path)
- `docs/spec.md §7 CT01–CT08` — Todos os casos de teste obrigatórios
- `docs/spec.md §8` — Definition of Done do produto
- `docs/spec.md §3 RF10` — Retry em falha de API
- `docs/spec.md §4 RNF02` — Latência e streaming
- `docs/spec.md §4 RNF03` — Segurança (sem API Key no bundle)
