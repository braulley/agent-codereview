## Why

C07–C11 precisam de tokens visuais, tipos TypeScript alinhados ao RF02 e funções puras de score (RF06) e URL de PR (RF01/RF09, CT05). C01 só deixa o scaffold Next.js 15 com pastas vazias e o tema default; sem esta fundação, cada tela reinventaria paleta, fontes e contratos. Esta mudança é MVP.

## What Changes

- Aplicar o tema Telemetry Triage de `docs/design.md` no frontend: tokens Tailwind v4, 0px de radius, superficies opacas, layout three-pane 100vh.
- Carregar Space Grotesk, Hanken Grotesk e JetBrains Mono via `next/font/google` (self-host; sem CDN em runtime).
- Definir tipos `AlertItem`, `Severity`, `Category` e união de eventos SSE espelhando C03 / `docs/spec.md` §5.
- Exportar `calculateHealthScore` / `healthBand` (fórmula RF06) e `validatePrUrl` (GitHub PR e GitLab MR; CT05).
- Primitivos em `components/ui/`: botão, badge de severidade, spinner, host de toast (sem lógica RF10).
- Constantes de path `/api/analyze`, `/api/diff/ingest`, `/api/health` **sem** `fetch` nem SSE.

### Non-goals (MVP; fora desta mudança)

- Monaco, abas de entrada, upload e DiffViewer (C07).
- Alert Panel, filtros, gauge do score (C08).
- Gutter/highlight (C09), Aplicar Correção/undo (C10), `useSSE` e toasts de erro reais (C11).
- Chamadas HTTP ao backend; `NEXT_PUBLIC_*` de chaves; persistência (ADR-02).
- Troca de stack, Tailwind v3 `tailwind.config.ts` como fonte de tokens, ou `/api/v1`.

## Capabilities

### New Capabilities

- `design-system`: tokens Telemetry Triage, fontes, shell three-pane e primitivos UI.
- `client-health-score`: recálculo client-side do Code Health Score e faixa visual (RF06, CT03).
- `pr-url-validation`: validação client-side de URL GitHub/GitLab antes de qualquer envio (RF01, RF09, CT05).

### Modified Capabilities

- Nenhuma. `openspec/specs/` ainda não tem capacidades arquivadas. O score canônico do backend permanece em C03 (`health-score`); aqui só o recálculo no cliente.

## Impact

- **Código:** `frontend/app/{layout,page,globals}.tsx/css`, `frontend/types/`, `frontend/lib/`, `frontend/components/ui/`. Pasta `frontend/` ainda não existe neste repo; C01 deve ter sido aplicado.
- **APIs:** nenhum endpoint novo; não altera `POST /api/analyze` → SSE → Monaco (RNF01/RNF02 não exercitados).
- **RFs/RNFs:** fundação de RF06 (fórmula + faixas), CA-RF01-03 / CA-RF09-03 / CT05 (URL), RNF03 (sem chaves no bundle), RNF04 (shell 100vh sem `backdrop-filter`). CT01, CT02, CT04, CT06–CT08 ficam para C07–C11.
- **Segurança/privacidade:** nenhum `GEMINI_API_KEY` / `GITHUB_TOKEN` / `GITLAB_TOKEN` no client; sessão só em memória; primitivos não persistem código/diff.
- **Dependências:** Next.js 15.x, Tailwind v4, TypeScript 5.x, Jest + RTL (já em C01). Fontes via `next/font` (já no framework). Sem cliente HTTP novo.
- **Bloqueia:** C07, C08 (C09–C11 indiretamente).
