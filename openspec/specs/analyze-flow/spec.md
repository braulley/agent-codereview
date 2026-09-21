# analyze-flow Specification

## Purpose

Orquestra o playground ponta-a-ponta: botão Analisar, skeleton de progresso e ligação do stream SSE à sessão de editor, alertas, highlights e score sem reload.

## Requirements

### Requirement: Ação Analisar no shell three-pane (docs/spec.md §6)
A página principal SHALL expor um controle **"Analisar"** (ou "Analisar Código") acessível no Central Stage / chrome da sessão. Prioridade P0. Ator: Desenvolvedor Solicitante.

Ao clicar, o sistema MUST:

1. Recusar envio se `code` do editor estiver vazio (após trim) com feedback visível, sem chamar a API.
2. Limpar o estado de análise anterior da sessão (alertas OPEN/RESOLVED da corrida anterior, score informativo, highlights) antes de iniciar o novo stream — preservando o texto do editor.
3. Disparar o cliente SSE com o `code` e `language` atuais do editor.
4. Manter o layout three-pane (`docs/design.md`: rail | stage | drawer) sem reload de página.

Radius MUST ser 0px; botão primary MUST usar beacon `#F97316` / texto canvas conforme `Button` do design system. Spinner no botão enquanto loading.

#### Scenario: Clique com código inicia análise
- **WHEN** o editor contém código não vazio e o usuário clica em Analisar
- **THEN** o sistema MUST iniciar `POST /api/analyze` e MUST NOT recarregar a página

#### Scenario: Clique com editor vazio não chama API
- **WHEN** o editor está vazio e o usuário clica em Analisar
- **THEN** o sistema MUST NOT emitir `POST /api/analyze` e MUST exibir feedback de validação

### Requirement: Skeleton e loading em ≤ 200ms (RNF02)
Após clique válido em Analisar, a UI MUST mostrar indicador de progresso (skeleton no painel de alertas e/ou spinner no botão) em ≤ 200ms. O indicador MUST permanecer até `done` completed, falha terminal ou abort. Prioridade P0.

Time-to-first-alert (primeiro card visível após clique) MUST visar ≤ 1.500ms p95 quando o backend emite o primeiro `alert` a tempo (RNF02); a orquestração MUST NÃO agrupar alertas em batch que atrase o primeiro card.

#### Scenario: Skeleton aparece imediatamente após Analisar
- **WHEN** o usuário clica Analisar com código válido
- **THEN** um skeleton ou spinner acessível MUST estar visível em ≤ 200ms e o botão Analisar MUST refletir estado de loading (`disabled` ou equivalente)

#### Scenario: done remove loading
- **WHEN** o stream entrega `event: done` com `status` `completed`
- **THEN** skeleton/spinner MUST ser removidos e o botão Analisar MUST voltar a aceitar novo clique

### Requirement: Ligação stream → sessão (painel, score, highlights)
Cada evento entregue pelo cliente SSE MUST atualizar a sessão já definida em mudanças anteriores, sem nova lógica de negócio:

| Evento | Efeito obrigatório |
|--------|-------------------|
| `alert` válido | Ingestão no painel; highlight/gutter quando a capacidade de editor highlight estiver presente |
| `score` | Atualização informativa; valor exibido do gauge permanece derivado dos OPEN (RF06) |
| `done` completed | Análise marcada concluída; loading off |
| falha / `error` | Loading off; editor e alertas já aceitos preservados; UI de erro |

CTs de exibição: **CT01**, **CT02**, **CT03**. Aplicar correção + undo (**CT07**) e filtros (**CT06**) MUST permanecer utilizáveis após uma análise bem-sucedida. Diff / URL inválida (**CT05**) permanece na capacidade de input modes.

#### Scenario: CT01 SQL Injection popula card CRITICAL
- **WHEN** o stream entrega um `alert` CRITICAL SECURITY de SQL Injection (fixture CT01)
- **THEN** o Action Drawer MUST mostrar o card correspondente e o rail de score MUST refletir a penalidade dos OPEN

#### Scenario: Fluxo colar → analisar → alertas sem reload (§6 steps 1–6)
- **WHEN** o usuário cola código, clica Analisar e o stream completa com alertas e score
- **THEN** painel, score e (se disponível) gutter MUST atualizar na mesma página sem navegação full reload

### Requirement: Editor permanece montado em sucesso e falha (RNF05)
Durante e após análise (sucesso, timeout, schema, rede), o Monaco / conteúdo do editor MUST permanecer montado e editável. Falhas MUST NOT desmontar o Central Stage nem apagar o `code` da sessão.

#### Scenario: Erro de análise preserva código colado
- **WHEN** a análise falha com timeout ou `LLM_SCHEMA` após o usuário ter colado código
- **THEN** o texto no editor MUST ser idêntico ao de antes da falha
