# Definição do Problema

## Problema

### Descrição

Equipes de engenharia de software perdem horas produtivas por ciclo de sprint aguardando revisões de código manuais, sendo sistematicamente expostas a vulnerabilidades de segurança críticas e sofrendo com sobrecarga cognitiva acumulada durante o processo de revisão. O fluxo atual de Code Review é lento, reativo e incapaz de fornecer feedback contextual e interativo antes do merge — resultando em entregas atrasadas, código frágil em produção e desgaste entre desenvolvedores e revisores.

---

### Contexto Atual

O processo de revisão de código nas equipes de desenvolvimento segue um fluxo puramente manual e assíncrono:

1. **Autores de PRs** abrem Pull/Merge Requests no GitHub ou GitLab e aguardam horas ou até dias por feedback humano.
2. **Tech Leads e Revisores** acumulam filas de revisões, gerando gargalos e priorizações subjetivas.
3. **Ferramentas estáticas** de CLI (ESLint, Pylint, SonarLint etc.) identificam erros sintáticos e de estilo, mas não fornecem sugestões contextuais, não explicam o *porquê* do problema e não permitem correções interativas no fluxo do PR.
4. **Bots de CI/CD** (ex: CodeClimate, Codacy) postam comentários estáticos automaticamente, porém sem capacidade de diálogo, sem raciocínio sobre o contexto do domínio e sem suporte a iterações imediatas.
5. **Revisores humanos** precisam verificar manualmente padrões de segurança básicos (SQL injection, credenciais expostas, IDOR etc.) — tarefa repetitiva que desvia foco do que realmente exige julgamento arquitetural.

O resultado é um processo que combina o pior dos dois mundos: lento como revisão manual e superficial como ferramenta estática.

---

### Impactos

* **Context switching frequente**: Desenvolvedores alternam entre tarefas enquanto aguardam retorno, perdendo o contexto mental do PR original e introduzindo erros nas correções subsequentes.
* **Atrasos nas entregas de sprints**: A latência no ciclo de revisão (média de 4–24h por iteração) comprime os prazos de entrega e força renegociações constantes de escopo.
* **Vazamento de vulnerabilidades críticas para produção**: Padrões como SQL Injection, credenciais hardcoded, exposição de tokens e falhas de autorização (IDOR) passam despercebidos pela revisão manual sobrecarregada, chegando a ambientes produtivos.
* **Desgaste interpessoal entre pares**: Revisores ficam sobrecarregados com volume de PRs triviais; autores sentem que feedbacks são tardios ou inconsistentes — deteriorando a cultura de qualidade e a colaboração técnica.
* **Feedback não-educativo**: Comentários estáticos de ferramentas de CI não explicam o raciocínio por trás das sugestões, perdendo oportunidades de crescimento técnico do time.
* **Ausência de rastreabilidade de qualidade**: Sem métricas consolidadas por PR, autor ou tipo de problema, gestores e Tech Leads não conseguem identificar padrões recorrentes para ações de melhoria.

---

### Evidências

* Estudos do setor (GitHub Octoverse, LinearB) apontam que o tempo médio de revisão de PRs em equipes de médio porte varia de **4 a 48 horas**, com impacto direto no cycle time de desenvolvimento.
* Relatórios da OWASP e SANS confirmam que **injeção de código (SQL Injection, Command Injection)** e **exposição de credenciais** figuram consistentemente no Top 10 de vulnerabilidades encontradas em produção — problemas detectáveis em fase de revisão.
* Pesquisas de Developer Experience (DX) (ex: SPACE Framework, McKinsey Dev Productivity) indicam que **interrupções e context switching** são os principais fatores de queda de produtividade reportados por engenheiros de software.
* Times que adotam feedback contínuo e automatizado no ciclo de PR relatam **redução de 30–50% no tempo de revisão** e aumento significativo na satisfação dos desenvolvedores (fonte: GitLab DevSecOps Survey).
* Em ambientes sem automação inteligente de revisão, **vulnerabilidades de segurança chegam a produção em média 3–6x mais frequentemente** do que em equipes com análise estática integrada ao PR workflow (Ponemon Institute).

---

## Objetivos

### O que queremos alcançar

* Reduzir a latência do ciclo de Code Review de horas/dias para **minutos**, com feedback automatizado e contextual disponível no momento da abertura do PR.
* Eliminar a detecção manual de vulnerabilidades de segurança básicas (OWASP Top 10) do escopo de atenção humana no processo de revisão.
* Proporcionar uma experiência de revisão **interativa e educativa**, onde o desenvolvedor pode corrigir, questionar e iterar sobre o feedback sem sair da interface do PR.
* Liberar Tech Leads e Revisores sêniores para focarem em revisões de alto valor: arquitetura, coesão de domínio e decisões de design.

### O que está fora do escopo (por ora)

* Substituição completa da revisão humana — o objetivo é augmentar, não eliminar, o julgamento humano.
* Análise de performance e otimização de algoritmos (escopo futuro).
* Suporte a revisão de infraestrutura como código (IaC) — Terraform, Bicep etc. (escopo futuro).

---

## Personas Afetadas

| Persona | Papel | Principal Dor |
|---|---|---|
| **Desenvolvedor (Autor de PR)** | Escreve e submete código para revisão | Aguarda horas por feedback; não sabe se seu código tem problemas de segurança até o review humano |
| **Tech Lead / Revisor Sênior** | Revisa PRs, garante qualidade técnica | Sobrecarregado com volume; perde tempo em erros triviais que deveriam ser pegos automaticamente |
| **Engineering Manager** | Gerencia entregas, métricas de qualidade | Sem visibilidade clara de gargalos no processo de revisão; sprints atrasam sem causa rastreável |

---

## Hipótese de Solução

> _Se fornecermos uma camada de revisão automatizada e interativa, baseada em IA, que analisa PRs no momento da abertura e oferece feedback contextual, explicativo e acionável — com suporte à detecção de vulnerabilidades de segurança e à iteração em tempo real — então reduziremos o cycle time de entrega, diminuiremos o volume de vulnerabilidades que chegam à produção e melhoraremos a experiência de desenvolvedores e revisores._

---

## Critérios de Sucesso (Outcomes Mensuráveis)

| Métrica | Baseline Atual | Meta |
|---|---|---|
| Tempo médio de 1º feedback em PRs | 4–24h | < 5 minutos |
| Taxa de vulnerabilidades OWASP detectadas antes do merge | < 40% | > 90% |
| Satisfação dos desenvolvedores (eNPS/DX Score) | A medir | +20 pontos |
| Redução de context switches por PR | A medir | -50% |
| PRs revisados por Tech Lead/semana (volume humano) | Baseline atual | -30% (redirected para revisões de alto valor) |

---

## Referências e Fontes

* [GitHub Octoverse – State of Open Source](https://octoverse.github.com/)
* [LinearB – Engineering Metrics Report](https://linearb.io/)
* [OWASP Top 10](https://owasp.org/www-project-top-ten/)
* [SPACE Framework – Developer Productivity](https://queue.acm.org/detail.cfm?id=3454124)
* [GitLab Global DevSecOps Survey](https://about.gitlab.com/developer-survey/)
* [Ponemon Institute – Cost of a Data Breach](https://www.ibm.com/security/data-breach)
* [McKinsey – Yes, you can measure software developer productivity](https://www.mckinsey.com/industries/technology-media-and-telecommunications/our-insights/yes-you-can-measure-software-developer-productivity)
