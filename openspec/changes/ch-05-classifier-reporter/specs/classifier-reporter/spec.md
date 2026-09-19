## Purpose

Classifica a severidade de problemas detectados no código e formata/posta revisões estruturadas no GitHub com comentários inline e sumário executivo.

## ADDED Requirements

### Requirement: Classificação e Normalização de Severidade
O sistema MUST classificar e priorizar todos os problemas identificados no código-fonte em 4 níveis de severidade (CRÍTICO, ALTO, MÉDIO, BAIXO) e determinar a recomendação final da revisão de acordo com a severidade máxima encontrada.

#### Scenario: Presença de problema crítico altera recomendação para REQUER_MUDANCAS
- **WHEN** a análise do diff identificar 1 ou mais problemas com severidade CRÍTICO (como vulnerabilidade OWASP ou vazamento de segredos)
- **THEN** a severidade máxima é definida como CRÍTICO e a recomendação final da revisão é definida como REQUER_MUDANCAS

#### Scenario: Apenas problemas de média ou alta severidade ativam APROVADO_COM_RESSALVAS
- **WHEN** a análise não contiver problemas CRÍTICO, mas contiver problemas de severidade ALTO ou MÉDIO (como violação SOLID ou problema de performance N+1)
- **THEN** a recomendação final da revisão é definida como APROVADO_COM_RESSALVAS

#### Scenario: Apenas problemas baixos ou ausência de problemas ativam APROVADO
- **WHEN** a análise contiver apenas problemas de severidade BAIXO ou nenhum problema
- **THEN** a recomendação final da revisão é definida como APROVADO

#### Scenario: Ordenação das ocorrências por gravidade
- **WHEN** a lista de problemas brutos for processada pelo classificador
- **THEN** a lista final de problemas é ordenada estritamente do nível mais grave para o menos grave (CRÍTICO -> ALTO -> MÉDIO -> BAIXO)

### Requirement: Formatação do Sumário Executivo e Comentários Inline
O sistema MUST formatar os comentários inline nas linhas afetadas e gerar um sumário executivo estruturado com a identificação do agente e contagem por severidade utilizando templates Jinja2.

#### Scenario: Sumário executivo contém identificação e métricas do agente
- **WHEN** o formatador gerar o texto do sumário executivo
- **THEN** a mensagem inclui a contagem de problemas por nível de severidade, a indicação dos top 3 riscos, a recomendação final e a assinatura do bot contendo nome do agente, versão do modelo e timestamp UTC

#### Scenario: Comentário inline possui estrutura visual limpa e informativa
- **WHEN** o formatador gerar o conteúdo de um comentário inline
- **THEN** a mensagem exibe explicitamente o badge de severidade, a categoria da falha, a descrição do problema e a sugestão acionável de correção

### Requirement: Publicação Unificada na API de Pull Requests do GitHub
O sistema MUST publicar o sumário executivo e todos os comentários inline em uma única chamada de revisão para o GitHub (`POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews`), prevenindo spam de notificações.

#### Scenario: Publicação com alteração solicitada quando houver crítico
- **WHEN** o revisor enviar a revisão para um PR contendo problemas com recomendação REQUER_MUDANCAS
- **THEN** o payload do review para a API do GitHub é enviado com o evento `REQUEST_CHANGES` contendo o sumário no corpo e a coleção de comentários inline associados

#### Scenario: Publicação como comentário geral em ausência de bloqueios críticos
- **WHEN** o revisor enviar a revisão para um PR onde a recomendação for APROVADO_COM_RESSALVAS ou APROVADO
- **THEN** o payload do review para a API do GitHub é enviado com o evento `COMMENT`
