## Purpose

Leitura, validação e aplicação de regras de negócio e convenções customizadas por repositório via arquivo .codereview.yml, injetando contextos e restrições no motor de análise LLM e exibindo configurações na interface visual.

## ADDED Requirements

### Requirement: Fetch and parse repository configuration

The system SHALL fetch `.codereview.yml` from the root of the analyzed repository via GitHub API and parse it into a validated structure (`version`, `languages`, `rules`, `block_merge_on`, `ignore`).

#### Scenario: Missing configuration file fallback
- **WHEN** GitHub API returns HTTP 404 for `.codereview.yml`
- **THEN** system logs a debug message and proceeds with default system analysis configuration

#### Scenario: Malformed configuration file fallback
- **WHEN** `.codereview.yml` contains invalid syntax or non-conforming structure
- **THEN** system logs a warning message and falls back to default configuration without throwing exceptions

### Requirement: Custom rules validation and truncation

The system SHALL validate custom rules and limit rules to a maximum of 20 items, with a maximum length of 100 characters per rule.

#### Scenario: Excessive custom rules provided
- **WHEN** `.codereview.yml` contains more than 20 custom rules
- **THEN** system truncates the list to the first 20 rules and records a warning log

### Requirement: Exclude ignored files from analysis

The system SHALL evaluate `ignore` glob patterns specified in `.codereview.yml` and filter out matching files prior to LLM diff processing.

#### Scenario: File path matches ignore pattern
- **WHEN** a modified file in the PR diff matches an `ignore` pattern such as `tests/**`
- **THEN** system skips diff analysis for that specific file

### Requirement: Inject custom rules into LLM prompt

The system SHALL inject parsed custom rules into the Jinja2 prompt template passed to the LLM Gateway during analysis.

#### Scenario: Prompt rendering with custom rules
- **WHEN** active project configuration contains valid custom rules
- **THEN** rendered prompt includes the custom rules section for LLM context evaluation

### Requirement: Repository configuration REST endpoint

The system SHALL expose an endpoint `GET /api/v1/repositories/{owner}/{repo}/config` returning active project configuration.

#### Scenario: Fetch repository configuration
- **WHEN** client requests GET `/api/v1/repositories/{owner}/{repo}/config`
- **THEN** system returns HTTP 200 with JSON payload containing active rules, ignore patterns, and severity settings

### Requirement: Rules and Governance frontend page

The system SHALL provide a `/settings` page in the dashboard allowing users to view current repository configurations and read setup instructions for `.codereview.yml`.

#### Scenario: Viewing settings page
- **WHEN** user opens `/settings` in the web application
- **THEN** system renders repository configuration state, inline YAML preview, and setup guide matching design mockups
