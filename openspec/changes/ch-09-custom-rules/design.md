## Context

Atualmente o `AnalyzerOrchestrator` executa a análise de diff utilizando regras estáticas globais. Para atender ao RF-08 (Pós-MVP), é necessário ler o arquivo `.codereview.yml` presente na raiz do repositório analisado via GitHub REST API, validar a configuração e injetá-la no prompt de análise e na filtragem de arquivos.

Ver `proposal.md` para motivação e escopo funcional detalhado.

## Goals / Non-Goals

**Goals:**
- Criar cliente `ProjectConfigReader` em `integrations/github/config_reader.py` para buscar `.codereview.yml`.
- Criar parser defensivo `ConfigParser` e modelo Pydantic `ProjectConfig` em `core/config/parser.py`.
- Atualizar `AnalyzerOrchestrator` para aplicar padrões de `ignore` no diff e injetar `rules` no template Jinja2 do prompt.
- Expor endpoint REST `GET /api/v1/repositories/{owner}/{repo}/config`.
- Criar página de configurações no frontend (`SettingsPage` em `/settings`) alinhada à tela `8ea76ff9` do protótipo Stitch.

**Non-Goals:**
- Edição remota direta do arquivo `.codereview.yml` no GitHub via UI (a UI é apenas para visualização e instrução de setup).
- Validação semântica automatizada de regras em linguagem natural fora do modelo LLM.

## Decisions

### 1. `ProjectConfigReader` isolado em `integrations/github/config_reader.py`
- **Afeta:** `integrations/`
- **Justificativa:** Conforme RNF-13, todas as chamadas à API do GitHub devem ser isoladas na camada `integrations/`. O método `get_codereview_config(owner, repo, branch)` encapsula o endpoint `GET /repos/{owner}/{repo}/contents/.codereview.yml`, tratando retornos HTTP 404 e erros de comunicação sem impactar o fluxo do worker.
- **Alternativas consideradas:** Fazer a chamada REST diretamente no orchestrator do analyzer (rejeitado por quebrar o encapsulamento arquitetural).

### 2. Tratamento Defensivo e Fallback no `ConfigParser`
- **Afeta:** `core/config/`
- **Justificativa:** Erros de sintaxe YAML ou estruturas inválidas no arquivo do usuário **nunca** devem interromper a revisão de código. O `ConfigParser` captura exceções de parse YAML/Pydantic, registrando logs de aviso e retornando a configuração padrão (`None`). Além disso, trunca a lista `rules` para no máximo 20 itens (máx. 100 caracteres por regra) para proteger o limite de tokens do LLM.
- **Alternativas consideradas:** Rejeitar a análise do PR com erro (rejeitado pois a experiência do usuário requer resiliência total).

### 3. Injeção de Regras Customizadas via Jinja2 no `AnalyzerOrchestrator`
- **Afeta:** `core/analyzer/`
- **Justificativa:** O template Jinja2 do prompt do LLM em `core/analyzer/` receberá o objeto `custom_rules` como contexto adicional. Se `custom_rules` estiver presente, a seção de diretrizes do projeto é renderizada no prompt; caso contrário, é omitida.
- **Alternativas consideradas:** Alterar o System Prompt global do LLM (rejeitado para preservar a persona e governança fixa do agente).

### 4. Exclusão de Arquivos por Glob Pattern (`ignore`)
- **Afeta:** `core/analyzer/`
- **Justificativa:** Antes de enviar os diffs para o LLM, o orchestrator filtra a lista de arquivos alterados comparando os caminhos com os padrões definidos em `ignore` (ex.: `tests/**`, `*.md`, `docs/*`) utilizando `fnmatch`.
- **Alternativas consideradas:** Filtrar os arquivos na postagem de comentários (rejeitado pois gera consumo desnecessário de tokens do LLM).

## Risks / Trade-offs

- **[Arquivo `.codereview.yml` inexistente ou inacessível]** → Mitigação: `ProjectConfigReader` retorna `None` em 404/erros; `AnalyzerOrchestrator` utiliza regras padrão perfeitamente.
- **[Aumento do consumo de tokens por regras extensas]** → Mitigação: `ConfigParser` limita e trunca estritamente `rules` (máx. 20 regras de 100 caracteres cada).
- **[Latência adicional na chamada de API para buscar config]** → Mitigação: Reutiliza a sessão assíncrona do `GitHubClient`, com timeout de 3 segundos.
