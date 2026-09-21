## 1. Setup (depende de C08 + C09)

- [x] 1.1 Confirmar C08: `frontend/hooks/useAlerts.ts` com `resolveAlert` / `unresolveAlert`, `AlertCard` com botão Aplicar Correção stub, score derivado de OPEN. Verificar: os símbolos existem; se C08 não estiver aplicado, parar e aplicá-lo antes.
- [x] 1.2 Confirmar C09: `useEditorHighlight` (ou equivalente) com clear/restore por `alertId`, e C07 `useEditor.applyEdit` / `registerEditor`. Verificar: os arquivos/exports existem; sem nova dependência npm.

## 2. Range helper e apply no editor (`useEditor`)

- [x] 2.1 Em `frontend/lib/alert-edit-range.ts` (ou equivalente puro): mapear `line_start`/`line_end` + texto do modelo → `ApplyEditInput` (colunas válidas). Componente/hook afetado: util puro usado por `useEditor` / composição. Verificar: função pura; `npx tsc --noEmit` aceita o arquivo.
- [x] 2.2 Testes `frontend/__tests__/lib/alert-edit-range.test.ts`: single-line CT01; multi-line; linha fora do modelo rejeita. Verificar: `npm test -- alert-edit-range` exit 0.
- [x] 2.3 Estender `frontend/hooks/useEditor.ts` se necessário: source `apply-fix` em `executeEdits`; exposição de subscribe a mudança de conteúdo (ou callback `onModelContentChange`) para D2. Verificar: `applyEdit` ainda sincroniza `content`; sem `fetch`.

## 3. Orquestração apply + undo sync

- [x] 3.1 Implementar `frontend/hooks/useApplyFix.ts` (ou handler em `page.tsx`): D1 — `applyEdit` + `resolveAlert` + `clearHighlight`; guarda editor não registrado; desabilita reentrância. Hooks afetados: `useApplyFix`, `useAlerts`, `useEditor`, `useEditorHighlight`. Verificar: `rg "fetch|EventSource|/api/analyze" frontend/hooks/useApplyFix.ts` vazio (ou no arquivo escolhido).
- [x] 3.2 Implementar sync de undo (D2): após apply, registrar snapshot; em `onDidChangeModelContent` (ou bridge do Monaco), se trecho voltou ao pré-apply → `unresolveAlert` + restaurar decoração. Verificar: undo manual sem apply não chama `resolveAlert`.
- [x] 3.3 Testes `frontend/__tests__/hooks/useApplyFix.test.ts` (mocks de Monaco/`EditorInstance`): apply chama `executeEdits` com range+suggestion (CA-RF04-01); `resolveAlert` uma vez; segundo alerta intacto (CA-RF04-02); simular content revert → `unresolveAlert` (CA-RF04-04). Verificar: `npm test -- useApplyFix` exit 0.

## 4. UI do card e score (AlertCard + composição)

- [x] 4.1 Atualizar `frontend/components/AlertPanel/AlertCard.tsx`: remover `disabled` do Aplicar Correção em OPEN; estilo primary `#F97316` / text `#090D16` / radius 0 (`docs/design.md`); RESOLVED → botão disabled + visual resolvido. Verificar: botão OPEN não tem `disabled`; RESOLVED tem.
- [x] 4.2 Ligar `onApplyFix` em `AlertPanel` / `app/page.tsx` ao hook da seção 3; garantir HealthDashboard re-renderiza score OPEN após resolve/unresolve. Verificar: fixture 1 CRITICAL → apply → gauge 100; undo → 75 (CA-RF04-05 caminho feliz).
- [x] 4.3 Testes `frontend/__tests__/components/AlertPanel/AlertCard.apply.test.tsx` e integração `frontend/__tests__/integration/ApplyFix.test.tsx`: clique aplica e marca RESOLVED (CA-RF04-03); outros cards intactos; score < 100 ms com `performance.now()` no handler mockado; Ctrl+Z / trigger undo restaura OPEN (CT07). Verificar: `npm test -- ApplyFix` e `AlertCard.apply` exit 0.

## 5. Decorações CA-RF08-03

- [x] 5.1 (depende de 3.1 e C09) Após resolve, `clearHighlight(id)`; após unresolve, reaplicar markers do alerta. Componente/hook afetado: `useEditorHighlight` + `useApplyFix`. Verificar: teste com mock de clear/restore chamado 1× no apply e 1× no undo.
- [x] 5.2 Teste `frontend/__tests__/hooks/useApplyFix.decorations.test.ts` (ou extensão do 3.3): apply remove decoração do id; undo restaura; outro id não é limpo. Verificar: `npm test -- useApplyFix` exit 0.

## 6. Qualidade

- [x] 6.1 (depende de 2–5) Rodar `cd frontend && npm run lint && npx tsc --noEmit && npm test && npm run build` e obter exit 0. Verificar: os quatro comandos exit 0.
- [x] 6.2 (depende de 6.1) Auditoria RNF03: `rg "GEMINI_API_KEY|GITHUB_TOKEN|GITLAB_TOKEN|NEXT_PUBLIC_GEMINI" frontend/hooks/useApplyFix.ts frontend/lib/alert-edit-range.ts frontend/components/AlertPanel` vazio; após build, as três strings de token não aparecem no bundle desta UI. Verificar: greps sem match.
- [x] 6.3 (depende de 6.1) Smoke browser CT07: colar código → ingest/fixture alerta → Aplicar Correção → texto+RESOLVED+score → Ctrl+Z → texto+OPEN+score. Verificar: comportamento observável conforme spec; sem reload.
