## Purpose

Estabelece o tema Telemetry Triage, o shell three-pane e os primitivos visuais do frontend para que C07–C11 compartilhem a mesma identidade sem chaves no cliente.

## ADDED Requirements

### Requirement: Tokens visuais Telemetry Triage (docs/design.md)
O frontend MUST aplicar o tema dark brutalist de `docs/design.md` em toda a aplicação. Prioridade P0. Ator: Desenvolvedor Solicitante. CTs desta mudança: nenhum dos CT01–CT08 (só o shell).

Tokens MUST:

| Token | Valor |
|---|---|
| canvas / floor 0 | `#090D16` |
| superfície L1 | `#111827` |
| superfície L2 | `#161F30` |
| superfície L3 | `#1E293B` |
| hairline sutil | `#1F2937` |
| hairline proeminente | `#2A364F` |
| beacon / HIGH | `#F97316` |
| CRITICAL | `#EF4444` |
| MEDIUM | `#EAB308` |
| LOW / secondary | `#3B82F6` |
| EXCELLENT / success | `#10B981` |

Todo componente MUST usar `border-radius: 0px`. Superfícies MUST ser 100% opacas (`backdrop-filter` MUST NOT ser usado — RNF04).

Contrato de tokens (CA visual):

```json
{
  "canvas": "#090D16",
  "surface_l1": "#111827",
  "surface_l2": "#161F30",
  "beacon": "#F97316",
  "severity": {
    "CRITICAL": "#EF4444",
    "HIGH": "#F97316",
    "MEDIUM": "#EAB308",
    "LOW": "#3B82F6"
  },
  "radius_px": 0
}
```

#### Scenario: Canvas e radius aplicados na home
- **WHEN** o usuário abre a rota `/` em viewport ≥ 1280px
- **THEN** o fundo da aplicação MUST ser `#090D16` e nenhum elemento estrutural MUST ter `border-radius` diferente de 0

#### Scenario: Sem blur em superfícies
- **WHEN** o CSS computado das superfícies L1/L2/L3 é inspecionado
- **THEN** `backdrop-filter` MUST ser `none` e a opacidade MUST ser 1

### Requirement: Tipografia operacional
A UI MUST usar Space Grotesk em títulos, labels e ações; Hanken Grotesk no corpo; JetBrains Mono em código, paths e contadores. As fontes MUST ser servidas pelo próprio frontend (self-host). Categorias `SECURITY`, `PERFORMANCE`, `QUALITY` e `MAINTAINABILITY` MUST ser renderizadas em uppercase.

#### Scenario: Famílias corretas no layout raiz
- **WHEN** o documento HTML da home é carregado
- **THEN** as três famílias tipográficas estão disponíveis sem requisição de runtime a `fonts.googleapis.com`

### Requirement: Shell three-pane 100vh
O layout raiz MUST ocupar `100vh` com três regiões nomeadas e scroll independente por painel, sem scroll de documento:

1. Left Telemetry Rail: 280px–340px
2. Central Stage: fluido
3. Right Action Drawer: 320px–420px, recolhível

Breakpoints MUST:

| Viewport | Comportamento |
|---|---|
| ≥ 1280px | três painéis visíveis |
| 1024px–1279px | drawer direito recolhido (slide-over) |
| < 1024px | coluna única com abas `[Telemetry]`, `[Editor]`, `[Remediation]` |

Nesta mudança os painéis MUST existir como slots (placeholders). Monaco, Alert Panel e gauge NÃO são exigidos aqui.

#### Scenario: Desktop mostra três painéis
- **WHEN** a viewport é ≥ 1280px
- **THEN** as três regiões estão presentes simultaneamente e a altura da shell é a da viewport

#### Scenario: Compacto vira coluna com abas
- **WHEN** a viewport é < 1024px
- **THEN** a interface MUST refluir para uma coluna com as três abas nomeadas e MUST NOT exigir scroll da página inteira para trocar de região

### Requirement: Primitivos sem segredo no cliente (RNF03)
O frontend MUST oferecer primitivos reutilizáveis de botão (primary/secondary/destructive), badge de severidade (CRITICAL/HIGH/MEDIUM/LOW), spinner e host de toast vazio. Nenhum primitivo MUST ler, embutir ou renderizar `GEMINI_API_KEY`, `GITHUB_TOKEN` ou `GITLAB_TOKEN`. O bundle de build MUST permanecer sem essas strings.

#### Scenario: Badge reflete as quatro severidades
- **WHEN** um badge é renderizado com cada valor de `severity`
- **THEN** a cor visível MUST corresponder à paleta OWASP desta spec

#### Scenario: Bundle sem chaves de produto
- **WHEN** `npm run build` gera o artefato `.next`
- **THEN** a busca pelas strings `GEMINI_API_KEY`, `GITHUB_TOKEN` e `GITLAB_TOKEN` MUST retornar zero ocorrências
