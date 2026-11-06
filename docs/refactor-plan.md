# WK.SLELCT Refactor Plan

## Scope and safeguards

- Refactor the current new-store project from GitHub `origin/main` at `2e875ac` on branch `codex/refactor-full-project`.
- Place the application and runtime files under `site/`. Keep the user-facing `README.md` and portfolio images at the repository root.
- The existing local workspace, original site files, `.env`/`.secrets`, backups, and untracked `new-site.zip` are outside this worktree and must remain untouched.
- Preserve the rendered UI, responsive behavior, routes, API paths and payloads, PostgreSQL schema and data, payment/order/inventory rules, environment behavior, and Docker service behavior.
- Do not push to `main` during refactoring. Do not run migrations against existing databases or remove Docker volumes.

## Repository baseline

- React 19, TypeScript, and Vite. `frontend/src/main.tsx` selects the storefront or `/admin`; storefront navigation uses hash routes. Existing CSS is loaded through the current `?inline` mechanism.
- TypeScript `strict` is already enabled. `npm run build` runs `tsc --noEmit` followed by `vite build`.
- No frontend test command, Playwright dependency, or existing E2E suite is present. Do not add a test framework as part of the first refactor phase.
- FastAPI routes are registered under `/api/v1`. Backend modules already group routers, schemas, services, and SQLAlchemy models by business area.
- PostgreSQL schema changes are out of scope. Alembic history is immutable during this work.
- The backend seed directory is `/app/data`; Compose mounts `./data:/app/data:ro`. Keep this relationship when moving Compose and data under `site/`.
- Local recorded acceptance on 2026-10-29 reported 62 pytest cases passed with one deprecation warning. This is historical evidence, not a fresh baseline for commit `2e875ac`.
- Current source sizes on this branch: `Storefront.tsx` 1,373 lines; `Admin.tsx` 1,238; `store.css` 2,396; `admin.css` 979; `new.css` 181.
- Eight screenshots were tracked in `test-results/` at the base revision. The current README references seven screenshots plus the ERD; keep those seven under `docs/images/screenshots/` and exclude the unreferenced ATM checkout image. Keep generated visual-test artifacts ignored under `site/test-results/`.

## Target repository layout

```text
README.md
.gitignore
docs/
  refactor-plan.md
  images/
    store-erd.svg
    screenshots/       # seven README screenshots, relative links
site/
  .dockerignore
  .env.example
  compose.yaml
  frontend/
  backend/
  data/
  infra/
  scripts/
```

Keep the existing domain-oriented backend layout. Organize frontend pages and feature components around the current storefront and admin responsibilities, without adding routing or state-management libraries. Do not create empty folders.

### Frontend extraction progress — complete

- Reduced `Storefront.tsx` from 1,373 to 594 lines by extracting the product page, member page, checkout, order summary, product card, navigation, store picker, recommendations, and product rules under `frontend/src/features/storefront/`.
- Reduced `Admin.tsx` from 1,238 to 531 lines by extracting the product table/payload helper, navigation editing, customer/request records, and account settings under `frontend/src/features/admin/`.
- Preserved the existing component markup and CSS class names; no styles or route selection were changed.
- `npm run build` passed after each extraction group (TypeScript and Vite production build). The most recent build transformed 57 modules and completed successfully.
- The Admin shell retains the dashboard and catalog, order, and content views that share its loaded data and refresh flow; standalone page components now live in `features/admin/`.

## Execution phases

### Phase 0: establish safe baseline

- Record source revision, clean worktree state, routes, API contracts, model/migration inventory, Compose services, and current screenshot references.
- Confirm the test database is isolated before running backend tests. Never use production or personal data for automated tests.
- Capture available baseline UI states using fixed test data and viewport sizes. Report any state that cannot be reproduced.

### Phase 1: repository organization — complete

- Move application/runtime files into `site/`, preserving relative paths expected by Docker Compose, Dockerfiles, scripts, and `/app/data`. (Complete.)
- Keep `README.md` and `docs/` at root. Replace the README's external ERD attachment URL with `docs/images/store-erd.svg`; use relative paths for all eight screenshots.
- Update `.gitignore` so `.env`, secrets, backups, dependencies, build output, generated screenshots, and local-only legacy iteration files remain excluded.
- Verify paths and Compose context resolution before code extraction.

Phase 1 checks on 2026-11-07:

- `docker compose -p wk-select-refactor -f site/compose.yaml --env-file site/.env.example config --quiet`: passed.
- All 8 README image links (7 screenshots and the ERD) resolve to files in the repository: passed.
- `npm run build` from `site/frontend`: passed; TypeScript check and Vite production build completed.
- No backend tests were run in Phase 1. The recorded 62-pass result remains historical until rerun in an isolated test database.

### Phase 2: React extraction — complete

- Split the large storefront and admin components by existing responsibilities. Preserve DOM structure, class names, event timing, state ownership, effects, hash routes, and storage behavior.
- Keep `main.tsx`'s path selection and CSS injection order. Do not modify CSS in this phase.
- Check whether moving the locally declared `ProductTable` changes mount behavior or state retention.
- Use the current `components/`, `lib/`, and existing admin editors where they are already suitable.
- Complete. Keep the current shared Admin shell and refresh flow intact; separate the independently owned page components as listed above.

### Phase 3: backend review — complete

- Audit existing modules and change only concrete readability or duplication issues. Keep `/api/v1`, response/error contracts, authentication, CSRF, session behavior, transaction boundaries, and third-party integration behavior.
- Preserve the current modular-monolith structure; do not add layers solely for architectural symmetry.
- Review found that business modules already own their routers, schemas, services, and models. Moved the existing audit-log endpoint from `main.py` into `modules/audit/router.py`; it remains under `/api/v1/admin/audit-logs` with the same response. No other backend extraction was justified.
- No backend tests were run: no `.env` or isolated `*_test` database is configured in this worktree. The test fixture drops and recreates its configured database, so testing is deferred until a disposable test database is explicitly available.
- `python -m compileall -q app` passed after moving the audit route.

### Phase 4: data, scripts, and infrastructure review — complete

- Keep PostgreSQL models and Alembic revisions unchanged. Review query changes against existing transaction and concurrency behavior.
- Keep the Compose services, volumes, health checks, environment variables, seed mount, and deployment behavior equivalent.
- Remove no script or data file until code, Docker, documentation, and workflow references are checked.
- Checked Compose service/build contexts, Dockerfiles, the PostgreSQL init script, seed-data mount, and script working-directory resolution after moving files to `site/`; all remain relative to the new project root.
- `docker compose -p wk-select-refactor -f site/compose.yaml --env-file site/.env.example config --quiet` passed. The five tracked seed JSON files remain in `site/data/`; the local-only content file and generated test artifacts are excluded by `.gitignore`.

### Phase 5: verification and documentation

- Run `npm run build` from `site/frontend`.
- Run existing backend pytest only with the confirmed isolated `_test` database; do not assume a frontend test suite exists.
- Compare available storefront/admin screenshots at fixed viewport sizes. Mark unavailable states and dynamic differences as unverified.
- Update documentation to reflect actual functionality. Describe payment as manual/sandbox where applicable and shipping as manually recorded; do not claim live payment settlement or carrier tracking.
- Preserve the user-facing README tone and relative image links.

Verification status for this worktree:

- `npm run build`: passed after the final frontend extraction.
- `python -m compileall -q app`: passed. This checks Python syntax, not API behavior.
- Compose configuration validation: passed using `site/.env.example`.
- README preview assets: all 8 references resolve to repository-relative files; none use an absolute local path.
- Backend pytest and fresh browser screenshots were not run. This worktree has no `.env`, disposable `*_test` database, or running app with fixed test data; the test fixture is destructive to its configured database. Existing README screenshots remain the documented preview set and were not regenerated.

## Change checkpoints

- Keep each phase in a focused commit and inspect its diff before proceeding.
- Do not combine broad formatting changes with behavior-preserving extraction.
- If an issue requires changing business rules, the database schema, public API behavior, production credentials, or deployment semantics, record it separately and stop that change for review.
- Before handoff, report completed, failed, and unverified checks. Do not claim pixel-perfect equivalence unless the corresponding states were compared.
