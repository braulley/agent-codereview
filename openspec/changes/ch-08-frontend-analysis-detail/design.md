## Context

Esta mudança implementa a tela de análise detalhada de um Pull Request no frontend (protótipo Stitch tela `9fa4b0e8`). A interface consome dados da API de Resultados (CH-06) e dos novos endpoints de metadados de contexto de diff. O design técnico estende os padrões de componentes, rotas e tokens estabelecidos em CH-07.

## Goals / Non-Goals

**Goals:**
- Implementar a página `/analysis/:id` (`AnalysisDetailPage`) com layout de três colunas (navegação, diff viewer, painel de inteligência contextual).
- Criar componentes modulares e reutilizáveis: `DiffInspector`, `InlineCommentBubble`, `IssueSidebar`, `AnalysisSummaryCard` e `FileDiffCard`.
- Garantir a navegação bidirecional entre a lista de issues no `IssueSidebar` e as linhas de código no `DiffInspector` (com scroll suave e destaque de linha).
- Implementar no backend FastAPI o endpoint `GET /api/v1/analyses/{analysis_id}/diff-context` em `opencode/src/api/routers/analyses.py`.

**Non-Goals:**
- Não persistir nem retornar o código-fonte integral no backend (apenas metadados de posição e linhas de contexto circundantes conforme RNF-07).
- Não permitir edição, modificação ou aprovação manual do PR via frontend no MVP.
- Não implementar navegação gráfica de AST.

## Decisions

### 1. Representação do Diff e Privacidade de Código (RNF-07)
- **Opção Considerada A:** Enviar o arquivo de código-fonte completo ou unified diff bruto do GitHub.
- **Opção Escolhida (B):** O backend consome o diff bruto, mas o endpoint `GET /api/v1/analyses/{analysis_id}/diff-context` expõe uma estrutura serializada de `FileDiff` contendo apenas fragmentos de contexto ($\pm 3$ linhas antes/depois de cada issue).
- **Justificativa:** Atende rigorosamente a exigência de privacidade e não-retenção de código (RNF-07), fornecendo contexto suficiente para o revisor humano sem trafegar nem expor repositórios inteiros.

### 2. Comunicação Inter-Componentes para Navegação e Scroll (Issue → Diff Line)
- **Opção Considerada A:** Passar `activeIssueId` via contexto global (Redux / Zustand).
- **Opção Escolhida (B):** Gerenciamento de estado local na página pai `AnalysisDetailPage` com `activeIssueId` e registro de `React.RefObject` para cada linha do diff.
- **Justificativa:** Mantém os componentes desencaixados e previne renderizações desnecessárias. O clique no issue dispara `scrollIntoView({ behavior: 'smooth', block: 'center' })` e aciona um estado de highlight CSS efêmero de 2 segundos na linha.

### 3. Estrutura dos Componentes Frontend
- `AnalysisSummaryCard`: Renderiza badge de recomendação (`REQUEST_CHANGES` em vermelho ou `APPROVED` em verde), métricas por severidade, top 3 riscos, `model_version` e timestamp formatado.
- `DiffInspector` & `FileDiffCard`: Agrupa alterações por arquivo, exibindo linhas com classes CSS para adição (`bg-emerald-950/40 text-emerald-300`), remoção (`bg-rose-950/40 text-rose-300`) e contexto neutro.
- `InlineCommentBubble`: Inserido diretamente abaixo da linha do diff afetada. Exibe "AGENT INSIGHT", severidade, descrição, recomendação de refatoração em bloco de código e botão de dispensar/colapsar.
- `IssueSidebar`: Painel fixo de 360px com abas/filtros de severidade e lista compacta de cards de issue ordenados por gravidade.

### 4. Novo Endpoint Backend (`GET /api/v1/analyses/{analysis_id}/diff-context`)
- **Localização:** `opencode/src/api/routers/analyses.py`
- **Contrato de Resposta:** `DiffContextResponse` contendo lista de `FileDiffContext` com `filename`, `additions`, `deletions`, `hunks` (linhas de código numeradas) e comentários associados por `line_number`.

## Componentes Afetados

- **Backend:** `opencode/src/api/routers/analyses.py`, `opencode/src/api/schemas/analysis.py`
- **Frontend:**
  - `frontend/src/pages/AnalysisDetailPage.tsx`
  - `frontend/src/components/DiffInspector.tsx`
  - `frontend/src/components/InlineCommentBubble.tsx`
  - `frontend/src/components/IssueSidebar.tsx`
  - `frontend/src/components/AnalysisSummaryCard.tsx`
  - `frontend/src/components/FileDiffCard.tsx`

## Risks / Trade-offs

- **[Risco]** Mapeamento incorreto da linha do diff com a linha do arquivo original → **Mitigação:** Backend calcula a posição absoluta da linha no unified diff durante o processamento do LLM e envia o par `(original_line, diff_line)`.
- **[Risco]** Desempenho com múltiplos comentários inline expandidos → **Mitigação:** Estado individual de colapso para cada `InlineCommentBubble`, iniciando colapsado ou expandido conforme severidade (Crítico inicia expandido).
