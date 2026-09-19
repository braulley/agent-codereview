# CH-08 — Frontend: Análise Detalhada do PR

**Tipo:** MVP | **Tamanho:** Médio | **Complexidade:** Média | **Risco:** Baixo

---

## Descrição

Implementa a tela de análise detalhada de um Pull Request, conforme o protótipo Stitch "Análise Detalhada do PR #42" (tela `9fa4b0e8`). Exibe o diff do PR com comentários inline do agente sobrepostos, o sumário de análise com issues classificados por severidade, e o painel de inteligência contextual lateral com detalhes de cada problema.

## Escopo Funcional

- Implementar componentes:
  - `DiffInspector` — visualizador de diff com linhas adicionadas (verde) e removidas (vermelho), numeração de linhas, e comentários inline do agente expandíveis por linha.
  - `InlineCommentBubble` — balão de comentário do agente com: badge "AGENT INSIGHT", severidade, descrição, sugestão, botão "Dismiss".
  - `IssueSidebar` — painel lateral direito (360px) com lista de issues filtráveis por severidade, clique navega para linha no diff.
  - `AnalysisSummaryCard` — card de sumário com: recomendação (REQUEST_CHANGES/APPROVED), contagens por severidade, top 3 riscos, model_version, timestamp.
  - `FileDiffCard` — container de arquivo alterado com header (path, contagem de adições/remoções), colapsável.
- Implementar página `AnalysisDetailPage` (`/analysis/:id`):
  - Busca `GET /api/v1/analyses/:id` e `GET /api/v1/analyses/:id/issues`.
  - Layout três colunas: sidebar navegação (herdada) | diff viewer (fluido) | painel de issues.
  - Destaque visual do trecho do diff ao clicar em issue no painel lateral.
- Implementar navegação de volta ao Dashboard.
- Adicionar endpoint backend: `GET /api/v1/analyses/{analysis_id}/diff-context` — retorna mapeamento issue_id → (arquivo, linha) para o frontend (somente metadados, nunca o diff completo).

## Requisitos Referenciados

- **RF-03:** Exibir comentários inline vinculados às linhas corretas do diff.
- **RF-04:** Sumário com contagem por severidade e recomendação final.
- **RF-07:** Issues ordenados de Crítico a Baixo.
- **RNF-14:** Exibir model_version e timestamp em todos os comentários.
- Protótipo Stitch: tela `9fa4b0e8` "Análise Detalhada do PR #42".

## Non-goals

- Não implementa "Apply Suggestion" (GitHub Suggested Changes — pós-MVP F08).
- Não implementa edição ou aprovação manual de review pela interface.
- Não exibe o diff completo do código-fonte (apenas linhas de contexto do problema — privacidade RNF-07).
- Não implementa AST graph navigator (futura versão do design system Stitch).

## Dependências

- **CH-06** (API de resultados com endpoint de issues) concluída.
- **CH-07** (componentes base: Sidebar, SeverityBadge, design tokens) concluídos.

## Riscos

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| Complexidade do DiffInspector (parsing unified diff no frontend) | Média | Usar biblioteca `diff2html` para parsing e renderização; não reinventar |
| Exibição de código-fonte completo violando privacidade | Média | Backend retorna apenas metadados de posição (arquivo + linha) — nunca o diff completo; revisão de segurança |
| Performance com diffs grandes (500 linhas) | Baixa | Virtualização de linhas com `react-window` se necessário |

## Execução de Linter

```bash
npx tsc --noEmit
npx eslint src --ext .ts,.tsx
```

## Testes Unitários Necessários

- `src/__tests__/components/DiffInspector.test.tsx` — renderizar com fixture de diff, verificar linhas verdes/vermelhas e numeração.
- `src/__tests__/components/InlineCommentBubble.test.tsx` — exibição de severidade, badge, collapse/expand.
- `src/__tests__/components/IssueSidebar.test.tsx` — filtro por severidade, clique navega para linha.
- `src/__tests__/components/AnalysisSummaryCard.test.tsx` — REQUEST_CHANGES renderiza em destaque; exibe model_version e timestamp.

## Testes de Integração Necessários

- `src/__tests__/pages/AnalysisDetailPage.test.tsx` — mock `api/client.ts`, verificar integração diff + issues + sumário.

## Testes E2E Necessários

- `tests/e2e/frontend/test_analysis_detail.spec.ts` (Playwright):
  - `test_detail_page_displays_issues_by_severity` — verificar ordenação e badges corretos.
  - `test_click_issue_highlights_diff_line` — clicar em issue → linha do diff destacada.
  - `test_critical_recommendation_displayed_prominently` — REQUEST_CHANGES visível com destaque visual.

## Critério de Conclusão

- Todos os testes passam.
- TypeScript sem erros.
- Revisão visual contra protótipo Stitch tela `9fa4b0e8`.
- Verificação: nenhum conteúdo de diff completo retornado pela API (apenas linhas de contexto).
