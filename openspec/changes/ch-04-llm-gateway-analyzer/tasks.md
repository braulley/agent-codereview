## 1. Configuração e Modelos Base

- [x] 1.1 Criar o módulo `opencode/src/integrations/llm/models.py` contendo a classe `RawIssue` (Pydantic model) com os campos `file_path: str`, `line_number: int`, `raw_severity: str`, `category: str`, `description: str`, `suggestion: str` e verificar a importação com Mypy strict.
- [x] 1.2 Atualizar `opencode/src/config/settings.py` para incluir as configurações `GEMINI_API_KEY: SecretStr`, `LLM_PROVIDER: str = "gemini"`, `LLM_TIMEOUT_SECONDS: int = 180` e verificar com testes unitários de carregamento de ambiente.

## 2. LLM Gateway e Template de Prompt

- [x] 2.1 Criar o template Jinja2 `opencode/src/integrations/llm/templates/analysis_prompt.j2` cobrindo OWASP Top 10 (SQL Injection, XSS, IDOR, Broken Access Control, Hardcoded Secrets), bugs de lógica, performance e violações SOLID, e verificar renderização com dados fictícios de PRDiff.
- [x] 2.2 Criar a classe abstrata `LLMGateway` (ABC) em `opencode/src/integrations/llm/gateway.py` definindo `async def analyze_diff(diff: PRDiff, context: str) -> list[RawIssue]` e a factory `get_llm_gateway()`.
- [x] 2.3 Implementar `GeminiGateway` em `opencode/src/integrations/llm/gateway.py` integrando com o SDK oficial do Gemini, incluindo a lógica de parsing defensivo para extração de JSON da resposta textual do LLM e fallback (`analysis_failed: true`) em exceções de rede ou timeouts.
- [x] 2.4 Implementar stub expansível `OpenAIGateway` em `opencode/src/integrations/llm/gateway.py` levantando `NotImplementedError` amigável quando configurado.

## 3. Orquestrador de Análise (PRAnalyzer)

- [x] 3.1 Criar o orquestrador `PRAnalyzer` em `opencode/src/core/analyzer/orchestrator.py` com o método `async def analyze(diff: PRDiff) -> list[RawIssue]`, invocando o `LLMGateway` e gerenciando falhas de análise.
- [x] 3.2 Implementar registro de logs de auditoria em `PRAnalyzer` incluindo metadados estruturados (`request_id`, `pr_id`, `repository`, `model_version`, `timestamp`) e garantindo que nem o conteúdo do diff nem tokens sejam logados (RNF-07, RNF-14).

## 4. Testes e Qualidade

- [x] 4.1 Criar suíte de testes unitários para o LLM Gateway em `opencode/tests/unit/integrations/llm/test_gateway.py` cobrindo parsing de JSON válido, resposta JSON malformada, simulação de timeout/falha de rede com retorno de fallback e alternância de provedor.
- [x] 4.2 Criar suíte de testes unitários para o orquestrador em `opencode/tests/unit/core/analyzer/test_orchestrator.py` validando execução única do gateway, estrutura dos logs de metadados, ausência do conteúdo do diff nos logs e verificação de categorias OWASP no prompt.
- [x] 4.3 Criar teste de integração `opencode/tests/integration/test_analyzer_to_llm.py` simulando o fluxo completo `PRAnalyzer` → `LLMGateway` com mock da API LLM.
- [x] 4.4 Executar verificações estáticas com `ruff check`, `ruff format --check` e `mypy --strict` garantindo 0 erros em `integrations/llm` e `core/analyzer`.
