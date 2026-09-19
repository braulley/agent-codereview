## 1. Config Reader & Parser Implementation

- [ ] 1.1 Criar o modelo Pydantic `ProjectConfig` e a classe `ConfigParser` em `opencode/src/core/config/parser.py` para tratar campos (`version`, `languages`, `rules`, `block_merge_on`, `ignore`), com limite de 20 regras e fallback seguro, e validar com testes unitários em `opencode/tests/unit/core/config/test_parser.py`.
- [ ] 1.2 Criar a classe `ProjectConfigReader` em `opencode/src/integrations/github/config_reader.py` com o método `get_codereview_config(owner, repo, branch)` buscando `.codereview.yml` via GitHub REST API e tratando HTTP 404/erros com fallback, e validar com testes unitários em `opencode/tests/unit/integrations/github/test_config_reader.py`.

## 2. Analyzer Orchestrator Integration & Prompt Tuning

- [ ] 2.1 Atualizar `AnalyzerOrchestrator` em `opencode/src/core/analyzer/orchestrator.py` para obter a `ProjectConfig`, aplicar padrões de `ignore` aos arquivos do diff e passar `rules` customizadas ao template Jinja2 de prompt.
- [ ] 2.2 Executar calibração do prompt LLM com regras customizadas e validar a injeção de contexto e exclusão de arquivos com testes em `opencode/tests/unit/core/analyzer/test_orchestrator_with_config.py` e `opencode/tests/integration/test_config_reader_to_analyzer.py`.

## 3. REST API & Frontend Settings Page

- [ ] 3.1 Criar endpoint REST `GET /api/v1/repositories/{owner}/{repo}/config` em `opencode/src/api/config.py` para expor a configuração ativa do repositório e validar com testes de API via `httpx`.
- [ ] 3.2 Criar a página de configurações `SettingsPage` (`/settings`) no frontend com exibição da configuração ativa, visualizador inline de YAML e guia de instruções de setup conforme protótipo Stitch `8ea76ff9`, e validar com `npx tsc --noEmit` e teste E2E em `opencode/tests/e2e/frontend/test_settings_page.spec.ts`.

## 4. Quality & Governance Verification

- [ ] 4.1 Executar os linters `ruff check opencode/src opencode/tests`, `ruff format --check` e checagem de tipos estrita `mypy opencode/src --strict` garantindo zero violações e cobertura de testes >= 80%.
