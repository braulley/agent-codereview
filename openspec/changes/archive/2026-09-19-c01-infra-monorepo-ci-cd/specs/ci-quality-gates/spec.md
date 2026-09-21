## Purpose

Define os quality gates automatizados em pull request e push para `main`, de modo que lint, types, testes e build falhem o merge quando quebrarem, sem chamar APIs externas nem expor segredos (RNF03).

## ADDED Requirements

### Requirement: Pipeline em PR e push para main
O repositório MUST executar um workflow de CI em todo pull request e em todo push para `main`. O pipeline MUST falhar (exit diferente de 0) se qualquer gate falhar. Prioridade P0; ator: CI. CTs: nenhum (CT01–CT08 não são desta mudança).

Gates obrigatórios:

| Camada | Gates |
|---|---|
| Backend | lint, typecheck estrito, testes com cobertura mínima de 80% em `backend/src/core` |
| Frontend | lint, typecheck, testes, build |

#### Scenario: PR dispara CI
- **WHEN** um pull request é aberto ou atualizado contra `main`
- **THEN** o workflow de CI executa os gates de backend e frontend

#### Scenario: Falha de lint bloqueia
- **WHEN** o lint do backend ou do frontend retorna exit diferente de 0
- **THEN** o job de CI falha e o conjunto de checks não fica verde

### Requirement: Testes de CI sem rede real
Testes unitários e de integração executados no CI MUST NOT chamar Gemini, GitHub ou GitLab de verdade. Qualquer HTTP externo MUST ser mockado. O workflow MUST NOT embutir valores reais de `GEMINI_API_KEY`, `GITHUB_TOKEN` ou `GITLAB_TOKEN` no YAML.

#### Scenario: Sem chamadas a provedores
- **WHEN** a suíte de testes do CI roda
- **THEN** nenhuma requisição de rede real é feita a APIs Gemini, GitHub ou GitLab

#### Scenario: YAML sem segredos de produto
- **WHEN** o arquivo de workflow é inspecionado
- **THEN** não contém valores reais das três chaves de produto

### Requirement: Auditoria de chaves no bundle do frontend
Após o build do frontend no CI, o artefato gerado MUST ser verificado contra as strings `GEMINI_API_KEY`, `GITHUB_TOKEN` e `GITLAB_TOKEN` (RNF03). A presença de qualquer uma dessas strings MUST falhar o job.

#### Scenario: Bundle limpo
- **WHEN** o CI conclui o build do frontend de um scaffold sem chaves no cliente
- **THEN** a busca pelas três strings no artefato de build não encontra ocorrências e o job passa

#### Scenario: Chave no cliente falha o CI
- **WHEN** o artefato de build contém a string `GEMINI_API_KEY`
- **THEN** o job de CI falha
