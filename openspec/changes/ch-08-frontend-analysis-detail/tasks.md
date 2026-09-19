## 1. Backend: Endpoint de Contexto de Diff

- [ ] 1.1 Criar schemas de resposta `DiffContextResponse` e `FileDiffContext` em `opencode/src/api/schemas/analysis.py` e verificar via `mypy opencode/src --strict`
- [ ] 1.2 Implementar o endpoint `GET /api/v1/analyses/{analysis_id}/diff-context` em `opencode/src/api/routers/analyses.py` retornando apenas as linhas de contexto (RNF-07) e verificar via `pytest opencode/tests/unit/test_analyses_api.py`

## 2. Frontend: Componentes de Visualização (Diff & Issues)

- [ ] 2.1 Criar componente `InlineCommentBubble.tsx` com visualização de badge "AGENT INSIGHT", severidade, sugestão de código e ação de dismiss, e verificar via `npm test src/__tests__/components/InlineCommentBubble.test.tsx`
- [ ] 2.2 Criar componente `FileDiffCard.tsx` e `DiffInspector.tsx` para renderizar trechos de diff com destaque visual em adições/remoções e comentários inline vinculados, e verificar via `npm test src/__tests__/components/DiffInspector.test.tsx`
- [ ] 2.3 Criar componente `IssueSidebar.tsx` com suporte a filtros por severidade e emissão de evento de seleção/navegação ao clicar no issue, e verificar via `npm test src/__tests__/components/IssueSidebar.test.tsx`
- [ ] 2.4 Criar componente `AnalysisSummaryCard.tsx` com recomendação (`REQUEST_CHANGES`/`APPROVED`), contagens por severidade, top 3 riscos, `model_version` e timestamp (RNF-14), e verificar via `npm test src/__tests__/components/AnalysisSummaryCard.test.tsx`

## 3. Frontend: Página e Integração

- [ ] 3.1 Implementar a página `AnalysisDetailPage.tsx` (`/analysis/:id`) integrando `DiffInspector`, `IssueSidebar` e `AnalysisSummaryCard`, com suporte a scroll suave e highlight ao clicar em um issue, e verificar via `npm test src/__tests__/pages/AnalysisDetailPage.test.tsx`
- [ ] 3.2 Adicionar a rota `/analysis/:id` em `frontend/src/App.tsx` e links de navegação a partir do Dashboard e verificar navegação via `npm test`

## 4. Testes E2E e Validação de Qualidade

- [ ] 4.1 Criar suite de testes Playwright `tests/e2e/frontend/test_analysis_detail.spec.ts` para validar o fluxo completo de navegação e destaque visual no diff e verificar executando o suite Playwright
- [ ] 4.2 Executar checagens estáticas de tipo e linting com `npx tsc --noEmit && npx eslint src --ext .ts,.tsx` no frontend e `ruff check opencode/src` no backend
