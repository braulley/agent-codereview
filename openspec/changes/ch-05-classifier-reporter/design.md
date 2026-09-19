## Context

Ver `proposal.md` para motivação e escopo.
Esta mudança introduz a etapa pós-LLM no pipeline:
`PRAnalyzer -> SeverityClassifier -> CommentFormatter -> GitHubReviewer`.
Os módulos afetados estão localizados em `core/classifier`, `core/reporter`, `integrations/github` e no orquestrador `core/analyzer/orchestrator.py`.

## Goals / Non-Goals

**Goals:**
- Mapear e normalizar `RawIssue` geradas pelo LLM para o modelo estrito `Issue` com `Severity` enum (CRÍTICO, ALTO, MÉDIO, BAIXO).
- Garantir que qualquer falha `CRÍTICO` defina a recomendação final para `REQUER_MUDANCAS`.
- Renderizar templates Jinja2 para comentários inline e sumário com identificação transparente do bot (RNF-14).
- Postar uma única revisão contendo todos os comentários inline e o sumário via GitHub Review API (evitando spam de webhooks/notificações).

**Non-Goals:**
- Não calcula pontuação numérica de risco (pós-MVP).
- Não suporta sugestão de código de 1-clique (GitHub Suggested Changes) nesta fase.
- Não persiste os comentários em banco de dados relacional.

## Decisions

### Decisão 1: Modelo de dados `Issue` e heurística de classificação
- **Componente:** `core/classifier/severity.py` e `core/classifier/models.py`.
- **Abordagem:** O `SeverityClassifier` recebe `list[RawIssue]`, valida se a severidade fornecida pela LLM encaixa no enum `Severity`. Se a severidade for ambígua ou ausente, aplica regras baseadas na categoria (`OWASP` -> CRÍTICO/ALTO, `SOLID` -> MÉDIO, `ESTILO` -> BAIXO).
- **Alternativas consideradas:**
  - *Confiar 100% no output da LLM*: Rejeitado devido ao risco de desalinhamento (ex.: LLM marcar SQL Injection como "MEDIUM").
  - *Classificação baseada apenas em Regex/AST*: Rejeitado porque perde o contexto semântico trazido pela LLM.

### Decisão 2: Formatação por Templates Jinja2
- **Componente:** `core/reporter/formatter.py` e templates em `core/reporter/templates/`.
- **Abordagem:** Uso do Jinja2 (`inline_comment.j2` e `summary.j2`) para isolar a apresentação da lógica Python. Permite customizar visualmente o badge de severidade (`🔴 CRÍTICO`, `🟠 ALTO`, `🟡 MÉDIO`, `🔵 BAIXO`) e a assinatura do agente (nome, modelo, timestamp).
- **Alternativas consideradas:**
  - *F-strings inline no código Python*: Rejeitado por acoplar formatação ao código e dificultar manutenção e internacionalização futura.

### Decisão 3: Postagem Atômica via `GitHubReviewer`
- **Componente:** `integrations/github/reviewer.py`.
- **Abordagem:** Enviar uma única requisição `POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews` com payload contendo `body` (sumário), `event` (`REQUEST_CHANGES` se `REQUER_MUDANCAS`, senão `COMMENT`) e `comments` (array de objetos `{path, position, body}`).
- **Alternativas consideradas:**
  - *Postar comentários individualmente via `POST /pulls/{pull_number}/comments`*: Rejeitado por gerar múltiplas notificações para os desenvolvedores e violar as boas práticas da GitHub API (RF-03).

## Risks / Trade-offs

- [Mapeamento de linha no diff do GitHub] → Se a linha reportada pela LLM não for uma linha alterada/adicionada no diff, o GitHub rejeitará a chamada da Review API.
  - *Mitigação:* `GitHubReviewer` ou `CommentFormatter` valida o campo `position` no diff antes de montar o payload inline; se inválido, converte a observação em nota no sumário geral.
- [Formatação Markdown no GitHub] → Caracteres especiais no código sugerido podem quebrar a renderização.
  - *Mitigação:* Templates Jinja2 usam blocos de código escapados para a sugestão de código.
