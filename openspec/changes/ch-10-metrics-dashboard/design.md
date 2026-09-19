# Technical Design — CH-10: Dashboard de Métricas & Analytics de Qualidade

## Context

Atualmente o sistema registra o resultado de análises de código na tabela `analysis_results` (SQLite). No entanto, Tech Leads e gestores de engenharia não possuem visibilidade centralizada sobre a evolução da qualidade dos projetos ao longo do tempo. Esta mudança introduz o módulo de agregação e a API de métricas no backend, além da página de dashboard interativo no frontend.

Ver `proposal.md` para motivação e `specs/metrics-dashboard/spec.md` para contratos funcionais detalhados.

## Goals / Non-Goals

**Goals:**
- Implementar `MetricsAggregator` em `opencode/src/core/metrics/aggregator.py` para consultar e agregar estatísticas da tabela `analysis_results`.
- Criar rotas FastAPI em `opencode/src/api/metrics.py` para summary, trend, top-issues e exportação CSV.
- Construir a interface do usuário `MetricsPage` no frontend React utilizando `recharts` para gráficos responsivos e visualmente atraentes.
- Fornecer cálculo simplificado de score de risco por repositório (ponderando severidades) preparando para F07.

**Non-Goals:**
- Não implementar exportação em PDF ou relatórios agendados por e-mail neste momento.
- Não utilizar modelos de Machine Learning para score de risco (manter algoritmo estatístico determinístico).
- Não alterar a estrutura da tabela `analysis_results` existente.

## Decisions

### Decisão 1: Abstração do `MetricsAggregator` no Core (`core/metrics/aggregator.py`)
- **Escolha:** Isolar a lógica de agregação em `core/metrics/` injetando a sessão de banco de dados (`AsyncSession`).
- **Razão:** Desacopla a camada HTTP (`api/metrics.py`) dos detalhes de consulta SQL/ORM e facilita o teste unitário isolado com mocks ou banco SQLite em memória.
- **Alternativas consideradas:** Executar queries SQL diretamente nas funções das rotas FastAPI (rejeitado por violar a separação de responsabilidades).

### Decisão 2: Agregação em Memória vs SQL Aggregation no SQLite
- **Escolha:** Utilizar agrupamento via SQL (`SUM`, `AVG`, `GROUP BY`) com índices apropriados em `analyzed_at` e `repository`.
- **Razão:** Eficiência de memória no servidor ASGI. Para a escala inicial (até 10.000 análises), o SQLite processa agregação SQL em milissegundos.
- **Alternativas consideradas:** Carregar todos os registros via Python e processar com Pandas/DataFrames (rejeitado por overhead excessivo de memória e dependência pesada desnecessária).

### Decisão 3: Visualização com Recharts no Frontend React
- **Escolha:** Utilizar a biblioteca `recharts` para gráficos de linha (tendências) e barras (top problemas), integrada ao tema visual existente (glassmorphism/dark mode).
- **Razão:** `recharts` é amplamente adotado, composável via React e possui suporte a animações e tooltips customizados.
- **Alternativas consideradas:** Chart.js com `react-chartjs-2` (rejeitado por menor integração declarativa React).

### Decisão 4: Formato de Exportação CSV Direto do Servidor
- **Escolha:** O endpoint `/api/v1/metrics/export?format=csv` gera o CSV via `csv.writer` / `io.StringIO` com header `Content-Type: text/csv` e `Content-Disposition: attachment; filename="code_quality_metrics.csv"`.
- **Razão:** Simplicidade de consumo no frontend (download direto via blob) sem necessidade de armazenar arquivos temporários em disco.

## Risks / Trade-offs

- **[Crescimento do banco SQLite]** → Consultas agregadas podem desacelerar se a tabela `analysis_results` crescer muito sem índices.
  *Mitigação:* Garantir que os índices em `repository`, `analyzed_at` e `severity` estejam ativos.
- **[Ausência de dados em ambientes novos]** → O gráfico pode parecer vazio para novos projetos.
  *Mitigação:* Implementar componente de Empty State elegante no frontend e dados sintéticos mock para dev/demo.
