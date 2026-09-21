## 1. Setup (depende de C01 aplicado)

- [x] 1.1 Confirmar o scaffold C01 (`frontend/app/page.tsx`, Jest, pastas `components/ui`, `lib`, `types`). Se C01 não estiver aplicado, parar e aplicar C01 antes. Nenhum hook. Verificar: `frontend/package.json` tem `next` 15.x; `frontend/__tests__` ou equivalente Jest existe; `test -d frontend/components/ui`.
- [x] 1.2 Confirmar Tailwind v4 no frontend (`@import "tailwindcss"` em CSS, sem tema v3 como fonte de verdade). Componente afetado: nenhum. Verificar: `rg "@import \"tailwindcss\"" frontend/app/globals.css` encontra match; não recriar `tailwind.config.ts` de tema.

## 2. Contratos TypeScript

- [x] 2.1 Criar `frontend/types/alert.ts` com `Severity`, `Category`, `AlertStatus` e `AlertItem` em snake_case (campos de C03 `alert-schema`). Nenhum hook. Verificar: `npx tsc --noEmit` aceita o arquivo; `rg "line_start|line_end" frontend/types/alert.ts` encontra os campos.
- [x] 2.2 Criar `frontend/types/analysis.ts` com `ScorePayload`, união `SseEvent` (`alert` \| `score` \| `done`) e `frontend/lib/api-paths.ts` com `/api/analyze`, `/api/diff/ingest`, `/api/health` (sem `fetch`). Nenhum hook. Verificar: `rg "fetch\\(|EventSource" frontend/lib frontend/types` vazio; `npx tsc --noEmit` exit 0.
- [x] 2.3 Teste unitário `frontend/__tests__/types/alert-contract.test.ts`: objeto CT01 (SQL injection) é atribuível a `AlertItem`; `severity` fora do enum não type-checka (assert via fixture JSON). Verificar: `npm test -- alert-contract` exit 0.

## 3. Design tokens e fontes

- [x] 3.1 Substituir tokens em `frontend/app/globals.css` via `@theme` (canvas `#090D16`, L1/L2/L3, beacon, severidades, `--radius-*` 0px). Sem `backdrop-filter`. Componente afetado: global CSS. Verificar: `rg "backdrop-filter" frontend/app/globals.css` vazio; `rg --fixed-strings "#090D16" frontend/app/globals.css` encontra match.
- [x] 3.2 Em `frontend/app/layout.tsx` (Server Component, nenhum hook) carregar `Space_Grotesk`, `Hanken_Grotesk`, `JetBrains_Mono` com `next/font/google` (`variable`, `display: 'swap'`), `lang="pt-BR"`, metadata “Agent Code Review”. Verificar: o arquivo importa `next/font/google` e não contém `fonts.googleapis.com`.
- [x] 3.3 Teste: smoke atualizado da home aplica classe de fonte no `<html>` e canvas. Componente afetado: `app/layout.tsx`. Verificar: `npm test` cobre o layout; snapshot ou `getComputedStyle`/classe contém as CSS variables `--font-space-grotesk` (ou equivalentes definidas).

## 4. Shell three-pane

- [x] 4.1 Implementar o grid 100vh em `frontend/app/page.tsx` (client só se o colapso/abas exigirem estado; nenhum hook de produto) com slots `aria-label` Left Telemetry Rail, Central Stage, Right Action Drawer. Componente afetado: `app/page.tsx`. Verificar: o markup contém os três landmarks; CSS usa `100vh` / `min-h-dvh`.
- [x] 4.2 Estilos responsivos: ≥1280px três colunas; 1024–1279 drawer recolhido; <1024 abas `[Telemetry] | [Editor] | [Remediation]`. Componente afetado: `app/page.tsx`. Verificar: classes/media queries documentam os três breakpoints no CSS ou no componente.
- [x] 4.3 Testes `frontend/__tests__/app/shell.test.tsx` (RTL): os três `aria-label` existem; em viewport estreita as três abas renderizam. Verificar: `npm test -- shell` exit 0.

## 5. Primitivos UI

- [x] 5.1 Implementar `frontend/components/ui/Button.tsx` (variants primary/secondary/destructive, radius 0) e `frontend/components/ui/SeverityBadge.tsx` (quatro severidades). Nenhum hook. Verificar: os arquivos exportam os componentes; classes usam tokens de severidade.
- [x] 5.2 Implementar `frontend/components/ui/Spinner.tsx` e `frontend/components/ui/ToastHost.tsx` (lista vazia, sem RF10). Nenhum hook. Verificar: `ToastHost` renderiza container acessível sem itens por default.
- [x] 5.3 Testes `frontend/__tests__/components/ui/*.test.tsx`: Button variants; SeverityBadge para CRITICAL/HIGH/MEDIUM/LOW; ToastHost vazio; Spinner tem status de loading. Verificar: `npm test -- components/ui` exit 0.

## 6. Code Health Score client-side (RF06)

- [x] 6.1 Implementar funções puras em `frontend/lib/health-score.ts`: `calculateHealthScore` e `healthBand` (cortes 91/71/41; cores da spec). Nenhum hook; sem `fetch`. Verificar: o módulo não importa `next/navigation` nem `api-paths`.
- [x] 6.2 Testes unitários `frontend/__tests__/lib/health-score.test.ts`: [] → 100 e counts 0 (CT03 / CA-RF06-03); 1 CRITICAL → 75; 1C+2H+1M+3L → 49; ≥4 CRITICAL → 0; bandas 100 EXCELLENT, 47 ATTENTION, 0 CRITICAL. Verificar: `npm test -- health-score` exit 0.

## 7. Validação de URL de PR/MR (RF01, RF09, CT05)

- [x] 7.1 Implementar `frontend/lib/pr-url-validator.ts` (`validatePrUrl`) com regex âncora GitHub/GitLab https-only, `number` só dígitos. Nenhum hook; sem `fetch`. Verificar: o arquivo não contém `fetch` nem `XMLHttpRequest`.
- [x] 7.2 Testes unitários `frontend/__tests__/lib/pr-url-validator.test.ts`: GitHub válido; GitLab válido; `https://github.com/user/repo/pull/abc` → `ok: false` + `INVALID_PR_URL` (CT05); vazio/`http://`/host estranho → `ok: false`. Verificar: `npm test -- pr-url-validator` exit 0.

## 8. Qualidade

- [x] 8.1 (depende de 2–7) Rodar `cd frontend && npm run lint && npx tsc --noEmit && npm test && npm run build` e obter exit 0 em todos. Verificar: os quatro comandos exit 0.
- [x] 8.2 (depende de 8.1) Auditoria RNF03: `rg -l "GEMINI_API_KEY|GITHUB_TOKEN|GITLAB_TOKEN" frontend/.next` não encontra matches; `rg "NEXT_PUBLIC_GEMINI|NEXT_PUBLIC_GITHUB|NEXT_PUBLIC_GITLAB" frontend` vazio. Verificar: ambos os greps vazios (exit 1 do rg sem match é o resultado esperado).
