# WK.SELECT Refactor Plan

## Scope and safeguards

- Refactor the current new-store project from GitHub `origin/main` at `2e875ac` on branch `codex/refactor-full-project`.
- The application and runtime files now live at the repository root alongside the user-facing `README.md` and `docs/`.
- The user moved application files from `site/` into the repository root. Preserve that move and all local `.env`/`.secrets` and generated files.
- Preserve the rendered UI, responsive behavior, routes, API paths and payloads, PostgreSQL schema and data, payment/order/inventory rules, environment behavior, and Docker service behavior.
- Do not push to `main` during refactoring. Do not run migrations against existing databases or remove Docker volumes.

## Repository baseline

- React 19, TypeScript, and Vite. `frontend/src/main.tsx` selects the storefront or `/admin`; storefront navigation uses hash routes. Existing CSS is loaded through the current `?inline` mechanism.
- TypeScript `strict` is already enabled. `npm run build` runs `tsc --noEmit` followed by `vite build`.
- Playwright E2E coverage is now available under `frontend/e2e/` and can be run with `npm run test:e2e` from `frontend/`.
- FastAPI routes are registered under `/api/v1`. Backend modules already group routers, schemas, services, and SQLAlchemy models by business area.
- PostgreSQL schema changes are out of scope. Alembic history is immutable during this work.
- The backend seed directory is `/app/data`; Compose mounts `./data:/app/data:ro` from the repository root.
- Local recorded acceptance on 2026-10-29 reported 62 pytest cases passed with one deprecation warning. This is historical evidence, not a fresh baseline for commit `2e875ac`.
- Pre-refactor source sizes: `Storefront.tsx` 1,373 lines and `Admin.tsx` 1,238. After extraction, they are 593 and 531 lines. CSS is unchanged (`store.css` 2,396; `admin.css` 979; `new.css` 181).
- The README references seven screenshots and the ERD using repository-relative paths. Generated visual-test artifacts under `test-results/` are ignored.

## Target repository layout

```text
README.md
.gitignore
docs/
  refactor-plan.md
  images/
    store-erd.svg
    screenshots/       # seven README screenshots, relative links
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

### Phase 1: repository organization — complete; files later moved to root

- The first organization pass placed application/runtime files under `site/`. The user later moved those files into the repository root; relative paths for Docker Compose, Dockerfiles, scripts, and `/app/data` now resolve from root.
- Keep `README.md` and `docs/` at root. Replace the README's external ERD attachment URL with `docs/images/store-erd.svg`; use relative paths for all eight screenshots.
- Update `.gitignore` so `.env`, secrets, backups, dependencies, build output, generated screenshots, and local-only legacy iteration files remain excluded.
- Verify paths and Compose context resolution before code extraction.

The checks below document the first `site/` layout pass. They are retained as history; current commands run from the repository root.

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
- Kept the existing domain modules and extracted product-view deduplication from the Catalog HTTP router into `modules/catalog/service.py`.
- Split Payments HTTP routes into the general payment router, sandbox callbacks, and order-linked ATM test endpoints. Public paths and transaction rules remain unchanged.
- Orders stock locking, idempotency, transitions, and payment coordination remain in the existing service because they enforce cross-record transaction behavior.
- No database schema or migration changes were made.
- The backend test fixture now requires `TESTING=true` and a separate `TEST_DATABASE_URL` ending in `_test`; it overrides `DATABASE_URL` before engine creation. See `backend/tests/README.md`.
- Current backend HTTP route files: Catalog router 222 lines; Payments general, sandbox, and ATM-test routers are 57, 116, and 64 lines. Orders service is 253 lines and remains responsible for stock locks, idempotency, and order state transitions.
- `python -m compileall -q app tests` passed. Full backend pytest passed against the isolated `wk_select_new_test` database: 63 passed, one Starlette/httpx deprecation warning.

### Phase 4: data, scripts, and infrastructure review — complete

- Keep PostgreSQL models and Alembic revisions unchanged. Review query changes against existing transaction and concurrency behavior.
- Keep the Compose services, volumes, health checks, environment variables, seed mount, and deployment behavior equivalent.
- Remove no script or data file until code, Docker, documentation, and workflow references are checked.
- The Compose project, data, scripts, and infrastructure now resolve from the repository root. The local-only content file and generated test artifacts are excluded by `.gitignore`.

### Phase 5: verification and documentation

- Run `npm run build` from `frontend/`.
- Run existing backend pytest only with the confirmed isolated `_test` database; do not assume a frontend test suite exists.
- Compare available storefront/admin screenshots at fixed viewport sizes. Mark unavailable states and dynamic differences as unverified.
- Update documentation to reflect actual functionality. Describe payment as manual/sandbox where applicable and shipping as manually recorded; do not claim live payment settlement or carrier tracking.
- Preserve the user-facing README tone and relative image links.

Verification status for this worktree:

- `npm run build` from `frontend/`: passed.
- `npm run test:e2e` from `frontend/`: 3 passed (store/cart/checkout path, mobile overflow, admin login and operations).
- `python -m compileall -q app tests` from `backend/`: passed.
- Backend pytest with `TESTING=true` and `TEST_DATABASE_URL` against the isolated `wk_select_new_test` database: 63 passed, one Starlette/httpx deprecation warning.
- Docker Compose verification ran in an isolated project on ports 18089/18449; the existing app on port 8089 was left untouched.
- README screenshots and ERD use repository-relative paths. Reference images were not regenerated during this pass.
- No CSS or database schema changes were made. Desktop/mobile flow checks passed; visual comparison found dynamic product/image differences, so pixel-perfect equivalence is not claimed. Playwright currently checks behavior and viewport overflow, but has no fixed screenshot snapshot assertions; pre-refactor visual equivalence remains unverified.
- Corrected the FastAPI title and npm package name to `WK.SELECT`/`wk-select`. Kept the Compose project name `wk-select-new` because changing it would rename running containers and volumes.

## Change checkpoints

- Keep each phase in a focused commit and inspect its diff before proceeding.
- Do not combine broad formatting changes with behavior-preserving extraction.
- If an issue requires changing business rules, the database schema, public API behavior, production credentials, or deployment semantics, record it separately and stop that change for review.
- Before handoff, report completed, failed, and unverified checks. Do not claim pixel-perfect equivalence unless the corresponding states were compared.
