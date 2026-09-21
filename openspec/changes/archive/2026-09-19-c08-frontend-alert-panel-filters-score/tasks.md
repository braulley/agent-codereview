## 1. Setup (depende de C06 aplicado)

- [x] 1.1 Confirmar C06 no frontend: `frontend/types/alert.ts`, `frontend/types/analysis.ts` (`SseEvent`), `frontend/lib/health-score.ts`, `frontend/components/ui/ToastHost.tsx` e `SeverityBadge.tsx`, slots three-pane em `app/page.tsx`. Nenhum hook novo. Verificar: os arquivos existem; se C06 não estiver aplicado, parar e aplicá-lo antes.
- [x] 1.2 Confirmar pastas `frontend/components/AlertPanel/` e `frontend/components/HealthDashboard/` (hoje `.gitkeep`). Nenhum hook. Verificar: os diretórios existem; não adicionar dependência npm (sem Zod).

## 2. Parser RF02 (`lib/alert-schema.ts`)

- [x] 2.1 Implementar `parseAlertItem` / `parseSseEvent` em `frontend/lib/alert-schema.ts` (required RF02, enums, `line_end >= line_start`, UUID `id`). Função pura; sem `fetch`. Verificar: o módulo não importa React nem `api-paths`; `npx tsc --noEmit` aceita o arquivo.
- [x] 2.2 Testes unitários `frontend/__tests__/lib/alert-schema.test.ts`: fixture CT01 (SQL Injection) aceita; objeto sem `severity` rejeita; `"URGENT"` rejeita; `line_end < line_start` rejeita. Verificar: `npm test -- alert-schema` exit 0.

## 3. Hook `useAlerts`

- [x] 3.1 Implementar `frontend/hooks/useAlerts.ts`: sessão em memória; `ingest(SseEvent)` (D3/D4); `toggleFilter`; `resolveAlert` / `unresolveAlert`; `selectAlert`; `filteredAlerts` (`useMemo`); default `visibleSeverities` = quatro níveis; `lastScore` guardado mas score derivado de OPEN. Verificar: o hook não chama `fetch`/`EventSource`; `rg "localStorage|indexedDB" frontend/hooks/useAlerts.ts` vazio.
- [x] 3.2 Testes `frontend/__tests__/hooks/useAlerts.test.ts` (`renderHook`): estado inicial vazio + todos filtros on; `ingest(alert)` CT01 aumenta lista; `ingest` inválido não adiciona; `ingest(done)` não apaga alertas; `toggleFilter` oculta/restaura o mesmo `id`; `resolveAlert` tira o alerta da contagem OPEN. Verificar: `npm test -- useAlerts` exit 0.

## 4. Cards e painel (`AlertPanel`, `AlertCard`)

- [x] 4.1 Implementar `frontend/components/AlertPanel/AlertCard.tsx`: campos RF02, badge categoria, L12, suggestion mono, botão Aplicar Correção **disabled**, estados OPEN / RESOLVED / `active`. Radius 0; borda esquerda 3px por severidade (`docs/design.md`). Verificar: o botão tem `disabled`; sem `executeEdits`.
- [x] 4.2 Implementar `frontend/components/AlertPanel/AlertPanel.tsx`: lista filtrada, scroll próprio, empty **"Nenhum problema encontrado"** (CT03). Verificar: empty state tem texto acessível quando `alerts.length === 0`.
- [x] 4.3 Testes `frontend/__tests__/components/AlertPanel/AlertCard.test.tsx` e `AlertPanel.test.tsx`: CT01 e CT02 renderizam CRITICAL+SECURITY; clique Aplicar Correção não muda o card; empty CT03; RESOLVED visível. Verificar: `npm test -- AlertPanel` exit 0.

## 5. Filtros (`SeverityFilters` + `useAlerts.toggleFilter`)

- [x] 5.1 Implementar `frontend/components/AlertPanel/SeverityFilters.tsx`: chips `CRITICAL|HIGH|MEDIUM|LOW` com `open_count`, `aria-pressed`, dim quando off. Sem filtro de categoria. Verificar: quatro chips; formato `HIGH (N)`.
- [x] 5.2 Testes `frontend/__tests__/components/AlertPanel/SeverityFilters.test.tsx` e integração painel: default todos visíveis; desativar LOW+MEDIUM deixa só CRITICAL/HIGH (CT06); reativar MEDIUM restaura; `HIGH (2)` com 2 OPEN + 1 RESOLVED; clique não dispara `fetch`. Verificar: `npm test -- SeverityFilters` e o caso CT06 no `AlertPanel` exit 0.

## 6. Gauge (`HealthDashboard`)

- [x] 6.1 Implementar `frontend/components/HealthDashboard/HealthDashboard.tsx`: usa `calculateHealthScore` + `healthBand` de C06 nos OPEN; número + band EXCELLENT/GOOD/ATTENTION/CRITICAL; cores `#10B981`/`#EAB308`/`#F97316`/`#EF4444`; breakdown das quatro contagens. Sem `GET /api/health`. Verificar: o componente importa `health-score`; `rg "fetch|/api/health" frontend/components/HealthDashboard` vazio.
- [x] 6.2 Testes `frontend/__tests__/components/HealthDashboard/HealthDashboard.test.tsx`: [] → 100 EXCELLENT (CT03); 1 CRITICAL → 75; 1C+2H+5M+3L → 25 ATTENTION; ≥4 CRITICAL → 0 CRITICAL; após `resolveAlert` do único CRITICAL → 100; ocultar chips não muda o número. Verificar: `npm test -- HealthDashboard` exit 0.

## 7. Composição da página e toast (D1, D4)

- [x] 7.1 Em `frontend/app/page.tsx` (hook `useAlerts`): Left Rail = `HealthDashboard` + `SeverityFilters`; Right Drawer = `AlertPanel`; toast de schema via `ToastHost` (mensagem sem `suggestion`). Não montar `useSSE`. Verificar: slots rail/drawer preenchidos; `rg "EventSource|ReadableStream" frontend/app/page.tsx` vazio.
- [x] 7.2 Testes `frontend/__tests__/app/alert-session.test.tsx` (ou equivalente): ingest inválido mostra toast e o Central Stage (editor/placeholder) permanece; 50 cards renderizam (RNF04 painel). Verificar: `npm test -- alert-session` exit 0.

## 8. Qualidade

- [x] 8.1 (depende de 2–7) Rodar `cd frontend && npm run lint && npx tsc --noEmit && npm test && npm run build` e obter exit 0. Verificar: os quatro comandos exit 0.
- [x] 8.2 (depende de 8.1) Auditoria RNF03: `rg "GEMINI_API_KEY|GITHUB_TOKEN|GITLAB_TOKEN|NEXT_PUBLIC_GEMINI" frontend/components/AlertPanel frontend/components/HealthDashboard frontend/hooks/useAlerts.ts frontend/lib/alert-schema.ts` vazio; após build, as três strings de token não aparecem no bundle `.next` gerado por esta UI. Verificar: greps sem match.
