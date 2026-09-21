## Purpose

Sincroniza o Monaco Editor e o painel de alertas em ambas as direções: clique no card rola e destaca a linha; clique no gutter foca o card correspondente, com no máximo um alvo ativo.

## ADDED Requirements

### Requirement: Navegação painel para editor (RF03)
O sistema SHALL, ao clicar em um card de alerta OPEN no painel lateral, rolar o Monaco Editor até `line_start` do alerta e aplicar highlight temporário no intervalo `line_start`–`line_end`. Prioridade P0. Ator: Desenvolvedor Solicitante / Tech Lead.

O card clicado MUST receber estado visual `active` (borda/background destacado conforme `docs/design.md`). A latência perceptível do ciclo (clique → scroll + highlight + `active`) MUST ser **< 300 ms** (CA-RF03-01). MUST NOT chamar `/api/*` nem Gemini. Estado MUST existir só em memória (ADR-02, RNF03).

CTs: preparação para fluxo Review Playground; **CT08** (arquivo grande sem freeze no scroll).

#### Scenario: Clique no card rola até line_start (CA-RF03-02)
- **WHEN** o usuário clica no card de um alerta com `line_start` 42 e o editor contém pelo menos 42 linhas
- **THEN** a viewport do editor MUST mostrar a linha 42 e o card MUST estar no estado `active`

#### Scenario: Latência do ciclo abaixo de 300 ms (CA-RF03-01)
- **WHEN** o usuário clica em um card com editor e painel já montados
- **THEN** scroll, highlight e estado `active` MUST completar em menos de 300 ms de latência perceptível

### Requirement: Highlight temporário de 2 a 3 segundos (CA-RF03-03)
Após navegação painel → editor, o highlight de fundo no intervalo do alerta MUST permanecer entre **2 e 3 segundos** e MUST ser removido automaticamente ao expirar. Uma nova seleção MUST cancelar o timer pendente da seleção anterior. Cores do highlight MUST seguir RF08 / capability `editor-highlighting`.

#### Scenario: Highlight some sozinho
- **WHEN** o usuário clica em um card e aguarda 3 segundos sem nova seleção
- **THEN** o highlight temporário MUST ter sido removido e o gutter permanente do alerta (se ainda OPEN e visível) MUST permanecer

#### Scenario: Nova seleção cancela o timer anterior
- **WHEN** o usuário clica no card A e, antes de 2 segundos, clica no card B
- **THEN** apenas o intervalo do alerta B MUST permanecer destacado como highlight temporário

### Requirement: Navegação editor para painel (RF03)
O sistema SHALL, ao clicar em um gutter icon de alerta no Monaco Editor, rolar o painel lateral até o card com o mesmo `id` e marcar esse card como `active`. Prioridade P0. Ator: Desenvolvedor Solicitante / Tech Lead.

Se o alerta correspondente estiver oculto pelo filtro de severidade (RF05), o sistema MUST NÃO alterar `active` de forma inconsistente: ou restaura visibilidade mínima necessária, ou ignora o clique sem erro — nesta mudança o comportamento MUST ser: **não selecionar** alertas cuja severidade não está em `visible_severities` (gutters desses níveis já ocultos).

CTs: **CT06** (gutters filtrados não são clicáveis).

#### Scenario: Clique no gutter foca o card (CA-RF03-04)
- **WHEN** o usuário clica no gutter icon de um alerta OPEN cuja severidade está visível
- **THEN** o painel MUST rolar até o card com o mesmo `id` e esse card MUST estar `active`

#### Scenario: Gutter de severidade filtrada não existe
- **WHEN** MEDIUM está desativado no filtro e existiria um alerta MEDIUM na sessão
- **THEN** MUST NOT haver gutter icon MEDIUM clicável naquela linha

### Requirement: Um único alvo ativo por vez (CA-RF03-05)
No máximo um alerta MUST estar `active` por vez. Selecionar outro alerta (via card ou gutter) MUST remover `active` do anterior. Alertas `RESOLVED` MUST NÃO receber `active` por navegação de gutter (ícone ausente ou inerte); clique em card RESOLVED MAY marcar `active` apenas se o card ainda estiver listado — nesta mudança, cards RESOLVED permanecem listados mas MUST NÃO disparar highlight de linha nem gutter.

#### Scenario: Troca de active entre cards
- **WHEN** o card A está `active` e o usuário clica no card B
- **THEN** apenas B MUST estar `active` e A MUST NÃO permanecer `active`

#### Scenario: RESOLVED não navega pelo gutter
- **WHEN** um alerta está `RESOLVED`
- **THEN** MUST NOT existir gutter icon ativo daquele alerta no editor
