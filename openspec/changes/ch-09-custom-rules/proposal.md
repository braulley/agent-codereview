# CH-09 — Regras de Negócio Customizadas via `.codereview.yml` (Pós-MVP)

**Tipo:** Pós-MVP | **Tamanho:** Médio | **Complexidade:** Média | **Risco:** Médio

---

## Descrição

Implementa a leitura e aplicação de regras de negócio e convenções específicas do projeto definidas em um arquivo `.codereview.yml` na raiz do repositório analisado. O agente busca esse arquivo via GitHub API no momento da análise e incorpora as regras ao prompt do LLM como contexto adicional. Inclui também a tela de configuração "Configurações de Regras & Governança" do protótipo Stitch.

## Escopo Funcional

- Implementar `integrations/github/config_reader.py` (`ProjectConfigReader`):
  - `get_codereview_config(owner, repo, branch) -> ProjectConfig | None`: busca `.codereview.yml` via `GET /repos/{owner}/{repo}/contents/.codereview.yml`.
  - Fallback gracioso: se arquivo não existir ou for inválido, retorna `None` (regras padrão aplicadas).
- Implementar `core/config/parser.py` (`ConfigParser`):
  - Valida e parseia o YAML para `ProjectConfig` (Pydantic model).
  - Campos: `version`, `languages`, `rules: list[str]`, `block_merge_on: Severity`, `ignore: list[str]`.
- Atualizar `core/analyzer/orchestrator.py`:
  - Buscar `ProjectConfig` antes da análise.
  - Injetar regras customizadas no template Jinja2 do prompt.
  - Aplicar `ignore` patterns para excluir arquivos da análise.
- Implementar `api/config.py`:
  - `GET /api/v1/repositories/{owner}/{repo}/config` — retorna configuração ativa do repositório.
- Implementar frontend — página `SettingsPage` (`/settings`):
  - Exibir configuração atual por repositório.
  - Editor de YAML inline (campo textarea com highlight básico).
  - Instrução de como adicionar o `.codereview.yml` ao repositório.
  - Alinhado ao protótipo Stitch tela `8ea76ff9` "Configurações de Regras & Governança".

## Requisitos Referenciados

- **RF-08 (Pós-MVP):** Leitura e aplicação de regras customizadas do projeto.
- **F06 (Pós-MVP):** Validação de Regras de Negócio Customizadas.
- **RNF-13:** Modularidade — config reader isolado em `integrations/`.

## Non-goals

- Não implementa UI de CRUD completo de regras (apenas exibição + instrução).
- Não valida semântica das regras em linguagem natural (validação é do LLM).
- Não suporta herança de configs entre repositórios.

## Dependências

- **CH-04** (LLM Gateway, template Jinja2) concluída — o config reader injeta no prompt existente.
- **CH-06** (API REST) concluída — novo endpoint de config usa o mesmo padrão.
- **CH-07** (Frontend base, Sidebar) concluído — nova página usa componentes existentes.

## Riscos

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| YAML malformado no repositório do usuário quebrando análise | Alta | `try/except` no parse + fallback para config padrão; nunca propagar exceção |
| Regras em linguagem natural aumentando taxa de falsos positivos | Média | Avisar usuário na UI que regras imprecisas afetam qualidade; meta de FP < 15% monitorada |
| Prompt com regras customizadas excedendo limite de tokens do LLM | Baixa | Limitar `rules` a 20 itens, máx 100 chars cada; truncar com aviso |

## Execução de Linter

```bash
ruff check opencode/src/integrations/github opencode/src/core/config opencode/src/api opencode/tests
ruff format --check opencode/src opencode/tests
mypy opencode/src/integrations/github opencode/src/core/config opencode/src/api --strict
npx tsc --noEmit  # frontend
```

## Testes Unitários Necessários

- `tests/unit/integrations/github/test_config_reader.py`:
  - `test_returns_project_config_when_file_exists` — mock GitHub API, arquivo válido.
  - `test_returns_none_when_file_not_found` — 404 da GitHub API.
  - `test_returns_none_on_invalid_yaml` — YAML malformado.
- `tests/unit/core/config/test_parser.py`:
  - `test_valid_config_parses_correctly` — todos os campos.
  - `test_ignore_patterns_applied_to_file_list` — verificar que `tests/**` exclui arquivos de teste.
  - `test_max_rules_limit_enforced` — mais de 20 regras → truncar + aviso.
- `tests/unit/core/analyzer/test_orchestrator_with_config.py`:
  - `test_custom_rules_injected_in_prompt` — verificar que regras customizadas aparecem no prompt renderizado.

## Testes de Integração Necessários

- `tests/integration/test_config_reader_to_analyzer.py`:
  - `test_analysis_with_custom_config_uses_custom_rules` — mock GitHub API com arquivo YAML + mock LLM, verificar prompt contém regras customizadas.

## Testes E2E Necessários

- `tests/e2e/frontend/test_settings_page.spec.ts` (Playwright):
  - `test_settings_page_displays_active_config` — verificar exibição da config atual.
  - `test_settings_page_shows_instructions_to_add_config_file` — verificar texto de instruções.

## Critério de Conclusão

- Todos os testes passam.
- `ruff check`, `mypy --strict` e `tsc --noEmit` sem erros.
- Análise sem `.codereview.yml` funciona normalmente (fallback testado).
- Revisão visual da tela de configurações contra protótipo Stitch `8ea76ff9`.
