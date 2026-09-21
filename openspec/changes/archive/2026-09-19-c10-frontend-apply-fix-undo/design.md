## Context

Camada afetada: **somente `frontend/`** — `hooks/useEditor.ts` (já expõe `applyEdit` / `undo` / `registerEditor`), `hooks/useAlerts` (C08: `resolveAlert` / `unresolveAlert`), `components/AlertPanel/AlertCard` (stub → enabled), bridge com `useEditorHighlight` (C09: clear/restore por `id`), composição em `app/page.tsx`. Nenhum módulo `backend/`.

Estado observado: `useEditor` já chama Monaco `executeEdits` e `trigger(..., "undo", ...)`. `AlertPanel/` ainda é `.gitkeep` até C08; `useAlerts` ainda não existe no tree até apply de C08. Tipos `AlertItem` + `AlertStatus` existem em `frontend/types/alert.ts`.

Motivação: ver `proposal.md`. Comportamento: spec `apply-fix-undo`.

Fluxo `POST /api/analyze` → SSE **não é aberto**. Apply é 100% client-side → **RNF02** (TTFA) e **RNF01** (schema LLM) inalterados. **RNF03**: sem chaves; sem persistir fonte/`suggestion`.

## Goals / Non-Goals

**Goals:**

- Um caminho de composição: clique no card → edição no Monaco → RESOLVED → score OPEN → clear decoração.
- Undo nativo do Monaco sincronizado de volta para OPEN + score + decoração.
- Botão primary habilitado conforme `docs/design.md` (beacon `#F97316`, radius 0).

**Non-Goals (nível de design):**

- Batch apply / fila de undos custom (fora do stack Monaco).
- Transport SSE (C11).
- Reimplementar fórmula de score (reusar `lib/health-score.ts`).
- Nova dependência npm.

## Decisions

### D1 — Apply = `useEditor.applyEdit` + `useAlerts.resolveAlert`

No composition root (ou handler no `AlertCard` via props), ao clicar Aplicar Correção:

1. Mapear `line_start`/`line_end` → range Monaco (colunas 1 … fim de linha / modelo).
2. `applyEdit({ range, text: alert.suggestion })` — source string estável (ex. `apply-fix`) para o undo stack.
3. `resolveAlert(alert.id)`.
4. `clearHighlight(alert.id)` (C09) se o hook estiver montado.

**Por quê:** `useEditor` já encapsula `executeEdits` e sync de `content`; C08 já planejou `resolveAlert`. Alternativa rejeitada: `setValue` no modelo inteiro — apaga o undo stack e quebra CT07.

### D2 — Undo sync via conteúdo + mapa de applies, não só tecla

Monaco emite `onDidChangeModelContent` (e o stack nativo trata Ctrl+Z/Cmd+Z). Após apply, guardar um snapshot mínimo `{ alertId, beforeSnippet }` (ou hash das linhas afetadas). Em mudança de conteúdo:

- Se o modelo **voltou** ao trecho pré-apply daquele id → `unresolveAlert(id)` + restaurar decoração C09.
- Ignorar undos/redos que não correspondem a um apply registrado.
- Edits manuais do usuário MUST NÃO marcar alertas como RESOLVED.

**Por quê:** só escutar keydown de Ctrl+Z falha com menu Edit → Undo e com multi-step undo. Alternativa rejeitada: undo stack próprio em React — duplica Monaco e diverge do RF04.

### D3 — Score = OPEN only, síncrono

`HealthDashboard` / sessão já derivam score de alertas `status === "OPEN"` (C08 D5). C10 só garante que `resolve`/`unresolve` disparam re-render; medir CA-RF04-05 nos testes com `performance.now()` em torno do handler (alvo < 100 ms; operação é O(n) alertas da sessão).

**Por quê:** CA-RF04-05 + RF06. Alternativa rejeitada: confiar no último evento SSE `score` — fica stale.

### D4 — Botão primary e estados do card

`docs/design.md`: primary Aplicar Correção — bg `#F97316`, text `#090D16`, `font-weight: 700`, uppercase Space Grotesk, radius 0, hover border `#FFFFFF`. OPEN: enabled. RESOLVED: disabled + check + opacidade reduzida (C08). Hint `⌘↵` opcional no footer; **não** obrigatório como único atalho nesta mudança.

**Por quê:** Stitch + design system. Alternativa rejeitada: manter `disabled` forever — contradiz RF04.

### D5 — Decorações (CA-RF08-03)

C10 **não** reimplementa gutter; chama a API de C09 (`clearHighlight` / reaplicar markers para OPEN). Se C09 ainda não aplicado no branch, o apply ainda resolve o card e o score; testes de gutter ficam gated em C09+C10.

**Por quê:** fronteira clara C09/C10. Alternativa rejeitada: duplicar `deltaDecorations` em C10.

### D6 — Segurança / falhas locais

Range inválido (`line_end` fora do modelo): toast genérico; editor e alertas inalterados; MUST NOT logar `suggestion`. Sem `fetch` no caminho de apply.

## Risks / Trade-offs

| Risco | Mitigação |
|---|---|
| Undo desfaz texto mas card fica RESOLVED | D2: snapshot + `onDidChangeModelContent` |
| Apply de N linhas desloca `line_*` de outros alertas | MVP: não reindexar linhas dos outros; documentar; batch apply fora de escopo |
| Monaco ainda não `registerEditor` | Guard: se sem instance, fallback já em `applyEdit` (setContent) — undo nativo indisponível; toast “Editor não pronto” preferível a silent fail |
| Corrida clique duplo | Desabilitar botão enquanto apply em voo / após RESOLVED |
| C08/C09 não merged | Tasks 1.x confirmam pré-requisitos; parar se faltarem |

**Trade-off:** sync de undo por comparação de snippet é heurístico; suficiente para CT07 (um apply + um undo). Multi-apply no mesmo range fica Pos-MVP.

## Migration Plan

Depende de C08 e C09 aplicados (ou stubs mínimos `resolveAlert`/`unresolveAlert` + clear highlight). Sem migração de dados. Rollback = revert. Após apply: `cd frontend && npm run lint && npx tsc --noEmit && npm test && npm run build` exit 0. Browser: colar → (fixture alert) → Aplicar Correção → Ctrl+Z (CT07).

## Open Questions

Nenhuma que altere specs. Atalho dedicado `⌘↵` pode espelhar o clique no apply se o design Stitch exigir na implementação; não muda RF04.
