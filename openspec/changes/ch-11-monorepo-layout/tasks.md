## 1. Relocar backend Python

- [x] 1.1 Criar `backend/` na raiz git e mover `src/`, `tests/` (exceto duplicata SPA se ainda na raiz), `pyproject.toml` e `requirements.txt` para `backend/`, verificando que `backend/src/main.py` e `backend/pyproject.toml` existem. (Depende de: nenhuma)
- [x] 1.2 Ajustar `backend/pyproject.toml` (`pythonpath`, `testpaths`, `tool.ruff.src`, `tool.mypy`) para o CWD `backend/` e verificar com `python -c "import src"` a partir de `backend/`.
- [x] 1.3 Executar `pytest tests/unit/api/test_health.py` a partir de `backend/` e verificar que os testes de health passam após o move.

## 2. Env na raiz e settings (depende da seção 1)

- [x] 2.1 Atualizar `backend/src/config/settings.py` para carregar `.env` da raiz git quando o CWD for `backend/`, sem logar secrets, e verificar com `pytest tests/unit/config/test_settings.py` a partir de `backend/`.
- [x] 2.2 Estender testes em `backend/tests/unit/config/test_settings.py` cobrindo resolução do `.env` pai vs CWD e verificar `pytest tests/unit/config/test_settings.py`.

## 3. Relocar frontend (pode em paralelo com 1 após criação da raiz)

- [x] 3.1 Mover `opencode/frontend/` para `frontend/` na raiz git e verificar `frontend/package.json` e `frontend/vite.config.ts`. (Independente da seção 1)
- [x] 3.2 Consolidar E2E Playwright no pacote frontend (manter specs sob `frontend/`; remover duplicata em `tests/e2e/frontend/` na raiz se existir) e verificar `npx tsc --noEmit` em `frontend/`.
- [x] 3.3 Executar `npm test` em `frontend/` e verificar que os testes Vitest existentes passam.

## 4. Relocar OpenSpec e remover `opencode/` (depende de 3.1)

- [ ] 4.1 Mover `opencode/openspec/` para `openspec/` na raiz (incluindo `changes/ch-11-monorepo-layout`) via `git mv` e verificar `openspec list --json` a partir da raiz git com root resolvido na raiz.
- [ ] 4.2 Remover `opencode/` se estiver vazio e verificar que não restam `opencode/src` nem `opencode/frontend`.

## 5. Documentação e mudanças in-progress (depende de 1–4)

- [ ] 5.1 Atualizar `AGENTS.md` e `README.md` (árvore, `cd backend` / `cd frontend`, `uvicorn src.main:app`) e verificar que não resta `opencode.src.main:app`.
- [ ] 5.2 Atualizar `openspec/config.yaml` e `openspec/roadmap.md` para caminhos `backend/` e `frontend/` e verificar que o context não cita `opencode/src` como layout vigente.
- [ ] 5.3 Atualizar paths em CH-08, CH-09 e CH-10 (`proposal`/`design`/`tasks`/`specs` in-progress) de `opencode/src` e `opencode/frontend` para `backend/` e `frontend/`, e verificar busca sem ocorrências nesses três changes.

## 6. Qualidade ponta a ponta (depende de 1–5)

- [ ] 6.1 Rodar em `backend/`: `pytest`, `ruff check src tests`, `mypy src --strict` e verificar exit code 0.
- [ ] 6.2 Rodar em `frontend/`: `npm test` e `npx tsc --noEmit` e verificar exit code 0.
- [ ] 6.3 Subir a API a partir de `backend/` e verificar `GET /health` retorna 200 com `"status": "ok"` (contrato inalterado).
