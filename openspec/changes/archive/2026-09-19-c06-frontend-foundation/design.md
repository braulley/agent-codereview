## Context

C01 (ainda não aplicado neste repo) entrega `frontend/` Next.js 15 + Tailwind v4 com pastas vazias e tema default. C03 define `AlertItem` e a fórmula de score no backend. Motivação: ver `proposal.md` (Why). Comportamento alvo: specs `design-system`, `client-health-score`, `pr-url-validation`.

Camada afetada: **somente `frontend/`** (layout, `globals.css`, `types/`, `lib/`, `components/ui/`). Nenhum módulo `backend/src/core/`.

Esta mudança **não altera** o fluxo `POST /api/analyze` → SSE → Monaco (ainda não existe no client). **RNF01** e **RNF02** não se aplicam. Segurança: **RNF03**. UI: tokens, 0px radius e three-pane de `docs/design.md`.

Premissas: C01 aplicado (Jest + RTL, `frontend/app/`, alias `@/*`); tipos de alerta em **snake_case** iguais ao JSON do SSE; rótulos de faixa em inglês (`EXCELLENT`…) como `docs/design.md` / C08 (equivalentes PT em `docs/spec.md` RF06 não são as chaves da API).

## Goals / Non-Goals

**Goals:**

- Tokens e shell usáveis por C07–C11 sem retrabalho visual.
- Funções puras testáveis para score e URL, sem I/O.
- Tipos que compilam contra o contrato RF02 / §5.

**Non-Goals (nível de design):**

- Implementar fetch/ReadableStream SSE (C11).
- Preencher os slots com Monaco, AlertCard ou gauge (C07/C08).
- Introduzir store global (Redux/Zustand); estado de sessão continua local aos hooks futuros.

## Decisions

### D1 — Tokens no `@theme` do CSS (Tailwind v4), não `tailwind.config.ts`

C01 gera Tailwind v4. A API v4 registra cores/fontes/radius em `frontend/app/globals.css`:

```css
@import "tailwindcss";
@theme {
  --color-canvas: #090D16;
  --color-surface-l1: #111827;
  --color-beacon: #f97316;
  --radius-none: 0px;
  --radius-sm: 0px;
  --font-display: var(--font-space-grotesk), ui-sans-serif, sans-serif;
  --font-sans: var(--font-hanken-grotesk), ui-sans-serif, sans-serif;
  --font-mono: var(--font-jetbrains-mono), ui-monospace, monospace;
}
```

**Por quê:** docs oficiais v4 (`@theme` + `--color-*`). Alternativa rejeitada: `tailwind.config.ts` estilo v3 (proposta inicial de C06) — diverge do scaffold C01.

Radius default 0px via tokens `--radius-*`. Sem `backdrop-filter` no CSS da shell.

### D2 — Fontes via `next/font/google` (self-host)

Em `app/layout.tsx`, Server Component, carregar `Space_Grotesk`, `Hanken_Grotesk`, `JetBrains_Mono` com `variable: '--font-…'` e `display: 'swap'`, aplicar as variáveis em `<html>`. `lang="pt-BR"`. Metadata: título “Agent Code Review”.

**Por quê:** Next.js 15 self-hosta o arquivo da fonte (sem runtime em `fonts.googleapis.com`), o que mitiga bloqueio corporativo/CI. Alternativa rejeitada: `<link>` CDN.

### D3 — Shell three-pane com slots, sem composição de produto

`app/layout.tsx` (estrutura + fontes) e `app/page.tsx` (`use client` só se o drawer/abas compactas exigirem estado). Desktop: grid `rail | stage | drawer`. Placeholders acessíveis (`aria-label`) para C07/C08 montarem. Drawer colapsa < 1280px; < 1024px vira abas.

Componentes: `components/ui/Button.tsx`, `SeverityBadge.tsx`, `Spinner.tsx`, `ToastHost.tsx` (lista vazia; C11 injeta toasts). Sem AlertCard.

### D4 — Tipos = JSON do backend (snake_case)

`frontend/types/alert.ts` e `frontend/types/analysis.ts` espelham C03 / `docs/spec.md` §5 **sem camelCase remap**, para o parser SSE de C11 não traduzir campos.

```ts
export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type Category = "SECURITY" | "PERFORMANCE" | "QUALITY" | "MAINTAINABILITY";
export type AlertStatus = "OPEN" | "RESOLVED";

export type AlertItem = {
  id: string; // UUID v4
  file: string;
  line_start: number;
  line_end: number;
  severity: Severity;
  title: string;
  description: string;
  suggestion: string;
  category: Category;
};

export type ScorePayload = {
  code_health_score: number;
  alert_count: Record<Severity, number>;
};

export type SseEvent =
  | { event: "alert"; data: AlertItem }
  | { event: "score"; data: ScorePayload }
  | { event: "done"; data: { analysis_id: string } };
```

Constantes em `frontend/lib/api-paths.ts`: `ANALYZE = "/api/analyze"` etc. **Sem** `fetch`. Alternativa rejeitada: `api-client.ts` com I/O (pertence a C11).

### D5 — Funções puras síncronas

`lib/health-score.ts`: `calculateHealthScore(alerts: Pick<AlertItem,"severity">[])` → `{ code_health_score, alert_count }`; `healthBand(score)` → `{ band, color }` com os cortes 91/71/41. Mesma fórmula de `backend/src/core/scorer` (C03). Recálculo < 100ms (CA-RF06-04) é propriedade da função síncrona; o gauge reativo é C08.

`lib/pr-url-validator.ts`: regex âncora início/fim; GitHub `pull/(\d+)`; GitLab `/-/merge_requests/(\d+)`. Sem rede. C07 só consome o resultado no input.

Testes Jest em `frontend/__tests__/lib/` (C01 já configurou o runner). Sem MSW nesta mudança.

### D6 — Sem chaves no client

Nenhum `NEXT_PUBLIC_GEMINI_*`. Paths relativos `/api/...` (o browser fala com o host do Next; proxy/CORS é C02/C11). Após `npm run build`, grep no `.next` pelas três strings (RNF03).

## Risks / Trade-offs

| Risco | Mitigação |
|---|---|
| Tailwind v4 `@theme` vs leftovers `tailwind.config.ts` do C01 | Fonte de verdade = `globals.css`; não reintroduzir tema v3 |
| `Hanken_Grotesk` / `Space_Grotesk` indisponíveis no `next/font/google` da 15.x | Confirmar nomes no apply; fallback `ui-sans-serif` nos tokens |
| snake_case vs convenção TS camelCase | Aceito: fidelidade ao SSE; documentar no arquivo de tipos |
| Shell rígida 100vh vs página default do C01 | Substitui o boilerplate; smoke da home passa a testar o shell |
| Placeholders vazios falharem a11y | Landmarks + `aria-label` nos três painéis e abas compactas |
| Tipos C06 divergirem de C03 se o Pydantic mudar | Revisar juntos em C11; campos obrigatórios copiados de `alert-schema` |

Trade-off: não há cliente HTTP “completo” em C06 (a proposta original listava `api-client.ts`). C11 evita wrapper morto e duplicata de SSE.

## Migration Plan

Depende de C01. Sem usuários. Rollback = revert. Após apply: `cd frontend && npm run lint && npx tsc --noEmit && npm test && npm run build` exit 0. Quem já tiver customizado o `globals.css` do scaffold perde o tema default (intencional).

## Open Questions

Nenhuma que altere specs ou o recorte de tarefas. Proxy Next → FastAPI (`rewrites`) fica para C11, quando houver SSE real.
