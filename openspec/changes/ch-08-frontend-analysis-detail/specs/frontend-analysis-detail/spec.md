## Purpose

Prover a interface e os contratos comportamentais para a visualização detalhada de análises de Pull Requests, integrando o visualizador de diff com comentários inline do agente, sumário de riscos e painel lateral de inteligência contextual.

## ADDED Requirements

### Requirement: Exibição da Análise Detalhada do Pull Request
O sistema frontend SHALL disponibilizar a rota `/analysis/:id` apresentando a interface de três colunas (sidebar de navegação herdada, visualizador de diff no centro, painel de inteligência contextual à direita) conforme o protótipo Stitch tela `9fa4b0e8`.

#### Scenario: Visualização da página de detalhes com sucesso
- **WHEN** o usuário acessa `/analysis/:id` com um ID de análise válido
- **THEN** a aplicação carrega os dados via `GET /api/v1/analyses/:id`, `GET /api/v1/analyses/:id/issues` e `GET /api/v1/analyses/:id/diff-context` renderizando o sumário da análise, o visualizador de diff e o painel de issues.

#### Scenario: Tratamento de erro ao carregar análise inexistente
- **WHEN** o usuário acessa `/analysis/:id` com um ID que não existe na API
- **THEN** o sistema exibe mensagem de erro amigável e opção de retornar ao Dashboard.

### Requirement: Card de Sumário da Análise (AnalysisSummaryCard)
O card de sumário SHALL exibir a recomendação final (`REQUEST_CHANGES` ou `APPROVED`), contagem de issues por severidade (Crítico, Alto, Médio, Baixo), top 3 riscos identificados, `model_version` e timestamp da revisão (RNF-14).

#### Scenario: Exibição de recomendação crítica em destaque
- **WHEN** a análise possui pelo menos um issue de severidade CRÍTICO
- **THEN** o card de sumário exibe a recomendação `REQUEST_CHANGES` com destaque visual em vermelho e o aviso de bloqueio de merge.

### Requirement: Visualizador de Diff e Comentários Inline (DiffInspector e InlineCommentBubble)
O componente `DiffInspector` SHALL renderizar as alterações de código com indicação visual de linhas adicionadas e removidas, numeração de linhas e balões de comentários inline (`InlineCommentBubble`) associados às linhas onde foram identificadas falhas.

#### Scenario: Renderização de balão inline do agente
- **WHEN** o diff possui um comentário do agente associado à linha N
- **THEN** o sistema exibe o `InlineCommentBubble` sob a linha N contendo o badge "AGENT INSIGHT", nível de severidade, descrição da falha, sugestão de correção acionável e o botão "Dismiss".

#### Scenario: Restrição de exibição de diff completo para privacidade (RNF-07)
- **WHEN** o diff é renderizado na interface
- **THEN** o sistema exibe apenas os trechos e linhas de contexto associados às falhas e não o arquivo de código-fonte na sua totalidade.

### Requirement: Painel Lateral de Issues e Navegação por Contexto (IssueSidebar)
O painel lateral direito (`IssueSidebar`) de 360px SHALL listar todos os problemas identificados ordenados por severidade (Crítico -> Alto -> Médio -> Baixo), permitindo filtrar por nível de severidade e, ao clicar em um issue, rolar e destacar automaticamente a linha correspondente no `DiffInspector`.

#### Scenario: Filtragem de issues no painel lateral
- **WHEN** o usuário seleciona o filtro de severidade "CRÍTICO" no `IssueSidebar`
- **THEN** a lista de issues exibe apenas as vulnerabilidades de nível crítico.

#### Scenario: Destaque de linha no diff ao clicar no issue
- **WHEN** o usuário clica em um card de issue no `IssueSidebar`
- **THEN** o visualizador de diff rola a tela até a linha correspondente e aplica destaque visual temporário na linha afetada.

### Requirement: Backend Endpoint de Metadados de Position do Diff
O backend SHALL disponibilizar a rota `GET /api/v1/analyses/{analysis_id}/diff-context` retornando o mapeamento de `issue_id` para arquivo, linha afetada e linhas de contexto circundantes sem persistir ou retornar o código-fonte integral (RNF-07).

#### Scenario: Requisição de metadados de posição do diff
- **WHEN** a página de detalhes solicita os dados de contexto de diff para uma análise
- **THEN** o backend responde com status HTTP 200 contendo o JSON com arquivos alterados, linhas modificadas e comentários vinculados às posições.
