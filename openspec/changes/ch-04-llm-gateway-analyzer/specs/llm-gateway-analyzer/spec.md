## Purpose

Prover uma interface desacoplada de abstração de LLM (LLM Gateway) e o orquestrador de análise (PRAnalyzer) para inspecionar diffs de Pull Requests contra regras de qualidade e vulnerabilidades OWASP Top 10 sem expor o código-fonte em logs ou persistência.

## ADDED Requirements

### Requirement: Intercambiabilidade de Provedores LLM
O sistema MUST implementar uma interface abstrata `LLMGateway` em `integrations/llm/gateway.py` que permita alternar entre provedores de LLM (como `GeminiGateway` e `OpenAIGateway`) através de configuração de ambiente (`settings.py`), sem alterar a regra de negócio do motor de análise (`core/analyzer`).

#### Scenario: Instanciação do provedor Gemini por padrão
- **WHEN** o sistema inicializa o `LLMGateway` com a configuração padrão do ambiente
- **THEN** o provedor selecionado e instanciado SHALL ser o `GeminiGateway` utilizando o SDK oficial da Google Gemini API.

#### Scenario: Alteração transparente de provedor LLM
- **WHEN** a variável de ambiente `LLM_PROVIDER` for configurada para `openai`
- **THEN** o `LLMGateway` SHALL instanciar o `OpenAIGateway` mantendo o mesmo contrato do método `analyze_diff(diff: PRDiff, context: str) -> list[RawIssue]`.

---

### Requirement: Prompt Estruturado de Análise de Código e Segurança OWASP
O `LLMGateway` MUST renderizar um template Jinja2 (`analysis_prompt.j2`) contendo instruções estruturadas para o LLM identificar problemas de segurança (OWASP Top 10: SQL Injection, XSS, IDOR, Broken Access Control, vazamento de secrets/credentials), bugs de lógica, race conditions e violações de princípios SOLID/clean code.

#### Scenario: Envio de diff estruturado no prompt
- **WHEN** o método `analyze_diff` for invocado com um `PRDiff` válido
- **THEN** o prompt enviado ao LLM SHALL conter a lista de arquivos alterados, linhas de adição/remoção e o contexto das alterações formatado em um JSON schema rígido esperado na resposta.

#### Scenario: Cobertura obrigatória das categorias OWASP no prompt
- **WHEN** o prompt de análise for renderizado
- **THEN** ele MUST conter explicitamente as diretrizes de checagem para OWASP Top 10 (SQL Injection, XSS, IDOR, Broken Access Control e Hardcoded Secrets).

---

### Requirement: Parsing Defensivo e Tolerância a Erros da Resposta LLM
O `LLMGateway` MUST realizar o parsing da resposta textual do LLM convertendo-a para uma lista de objetos `RawIssue` (`integrations/llm/models.py`), tratando retornos malformados ou incompletos de forma defensiva.

#### Scenario: Parsing com sucesso de resposta JSON válida
- **WHEN** o LLM retornar uma estrutura JSON válida contendo uma lista de problemas com arquivo, linha, severidade bruta, categoria, descrição e sugestão
- **THEN** o `LLMGateway` SHALL retornar uma lista correspondente de instâncias de `RawIssue`.

#### Scenario: Tratamento de resposta JSON malformada do LLM
- **WHEN** o LLM retornar um texto que não seja um JSON válido ou apresente erros de sintaxe
- **THEN** o `LLMGateway` SHALL registrar um log de aviso (warning) detalhando a falha de sintaxe e retornar os itens parseáveis ou uma lista vazia, sem lançar exceções não tratadas para o orquestrador.

---

### Requirement: Orquestração do Analyzer e Registro Seguro de Metadados
O orquestrador `PRAnalyzer` (`core/analyzer/orchestrator.py`) MUST receber o `PRDiff`, invocar o `LLMGateway`, e registrar logs de auditoria contendo metadados estruturados, garantindo a não retenção nem vazamento do código-fonte (RNF-07, RNF-14).

#### Scenario: Logs de auditoria contendo metadados rastreáveis
- **WHEN** o `PRAnalyzer.analyze(diff)` for executado
- **THEN** o sistema SHALL registrar um log estruturado contendo `request_id`, `pr_id`, `repository`, `model_version` e `timestamp`.

#### Scenario: Garantia de não retenção e privacidade do código-fonte
- **WHEN** o `PRAnalyzer` processa um diff de Pull Request
- **THEN** o conteúdo do diff NUNCA SHALL ser persistido em disco nem gravado em logs de produção, mantendo conformidade com RNF-07.

---

### Requirement: Fallback Gracioso em Indisponibilidade ou Timeout
Se o provedor de LLM estiver indisponível, responder com erro HTTP/API ou exceder o tempo limite configurado (timeout), o `LLMGateway` e o `PRAnalyzer` MUST tratar a falha graciosamente e sinalizar fallback (RNF-05).

#### Scenario: Ativação de fallback por erro de conexão ou API indisponível
- **WHEN** a chamada ao LLM falhar por exceção de rede, rate limit ou indisponibilidade do serviço
- **THEN** o `LLMGateway` SHALL capturar a exceção, registrar o erro em log e retornar um resultado com `analysis_failed: true` e lista de `RawIssue` vazia para processamento por regras estáticas.

#### Scenario: Timeout de execução do LLM
- **WHEN** a chamada ao LLM ultrapassar o tempo limite estabelecido (ex.: 3 minutos para diffs ≤ 500 linhas)
- **THEN** o `LLMGateway` SHALL interromper a requisição, acionar o fallback e sinalizar a falha sem bloquear a pipeline.
