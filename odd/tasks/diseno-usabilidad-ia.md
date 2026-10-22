Feature: diseno-usabilidad-ia (design and usability pass on Gemini results)
Branch: feat/ai-frontend-diseno-usabilidad (stacked on feat/ai-frontend-resumen-acreditacion, PR #15)
Delivery: ask-on-risk; chained PRs per work unit. Push, PR and merge are human decisions.
Test runner: pnpm test (vitest). Typecheck: pnpm typecheck. Lint: pnpm lint.

## Specs
S1 Gemini draft results read as a document: week and totals in a clear header, distinct loading, result, empty and error states.
S2 Usability: the user can regenerate without discarding; copying confirms with visible text; the draft shows its length; a generic failure offers a retry.
S3 General design: reuse existing tokens and Panel/Section primitives; no new palette, no new typeface, no all-caps labels, no decorative arrows; keep Spanish UI copy in the existing voice.
S4 Error copy stays specific: 503 says the AI is unavailable and the student can write the report by hand; offline says the draft needs connection.
S5 Scope: only the weekly draft panel in this unit. Broader page-level design is a later unit, decided after this PR.
S6 Logo: one application mark used in the header, login and favicon.
S7 Lists: search box, filter and pagination where lists grow; pages stay readable on mobile; the search matches names, titles and descriptions ignoring case and accents.

User request (verbatim, L1): "continuemos donde lo dejamos necesito que mejores el diseño general de la aplicacion mejorando tambien la aprte de la usabilidad y presentacionde los resultados de gemini, utiliando skills de desiño que ya tienes implementadas tiene  que estar encadenados en prs teniendo tambien como base los rps que estan en frontend"

## Tasks
T1 S1, S2, S4 - WeeklySummaryPanel result header, regenerate, copy feedback, character count, retry. Route: inline. Status: done. RED: 6 new behavior tests failing before the change; GREEN: 9/9 in src/components/ai, tsc clean, eslint clean (0 errors). Commit: feat(ui) weekly draft usability (see git log).
T2 S3 - AI provenance as a Tag instead of a middle-dot aside; review note stated as a sentence; existing tokens only. Route: inline. Status: done. RED: new provenance test failing first; GREEN: 10/10 in src/components/ai; full pnpm test 30/30 files passing. Commit: feat(ui) AI provenance tag (see git log).

T3 S3 - Systemic visual bug: twMerge treated numeric text sizes (text-14) as colors and dropped text colors (primary buttons rendered dark text on navy). Fix in src/lib/utils.ts with tests. Route: inline. Status: done (pnpm test 149/149, tsc and eslint clean). Commit: fix(ui) (see git log).
T4 S3 - Visual pass from Playwright screenshots: StatCard hierarchy, header button height, student empty states inside Panel. Route: inline. Status: done for desktop; mobile sidebar/sync card compaction pending. Commit: style(ui) (see git log).

T5 S6 - Logo: Logo/LogoMark component in header and login, favicon.svg, manifest icon. Route: inline. Status: done. Commit: feat(ui) logotipo (see git log).
T6 S7 - Search, filters and pagination on lists: OffersPage, MyApplicationsPage, MyStudentsPage, CompanyOffersPage, OfferApplicationsPage, AccreditationPage, HourLogsPage. Client-side over the fetched list: backend list endpoints return full arrays without page parameters. Route: inline. Status: done (pnpm test 162/162, tsc 0, eslint 0 errors). Commit: feat(ui) listados (see git log).

## Log
L5 Playwright capture (scratch dir, outside repo) with mocked API: login, student, tutor, company, coordinator screens. Findings: primary button text invisible, stat cards unbalanced, student empty states floating without a container, header buttons of different heights, mobile sync card pushes content down (pending).
L1 User request above (verbatim).
L2 Exploration: Gemini results are rendered only by src/components/ai/WeeklySummaryPanel.tsx (api in src/api/ai.ts). Baseline: 5 tests passing in src/components/ai.
L3 Design skills consulted: web-design-guidelines (focus, reduced motion, clarity), frontend-design (restraint; avoid templated tells such as all-caps eyebrows and middle-dot meta strings). Existing tokens in src/index.css are kept.
L4 Plan: TDD for T1 (RED on new behavior tests, then GREEN), then T2 with its own commit.
