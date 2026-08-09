# Documentation Index

This is the entry point. Read this file first, then only the specific doc(s) below relevant to the task — not the full codebase — before touching code.

| Doc | Covers | Level |
|---|---|---|
| [`architecture/OVERVIEW.md`](architecture/OVERVIEW.md) | System topology: apps, data stores, how they connect | System |
| [`architecture/DATA_FLOW.md`](architecture/DATA_FLOW.md) | How an event gets from a source into the map, and how new sources plug in | System / design |
| [`architecture/TECH_STACK.md`](architecture/TECH_STACK.md) | Tech stack per app, core architecture rules, decision log. **Major changes need user confirmation before implementation — read this before proposing one.** | System / rules |
| [`architecture/REFERENCES.md`](architecture/REFERENCES.md) | Ideas pulled from external projects (currently: worldmonitor.app) and where each landed here | System / rules |
| [`architecture/TESTING.md`](architecture/TESTING.md) | Testing framework, unit vs. integration tiers, what pre-commit runs | System / rules |
| [`api/README.md`](api/README.md) | Index of per-app API docs (each independent app that exposes an API gets its own file under `api/`) | API index |
| [`api/intelligence-engine.md`](api/intelligence-engine.md) | Every HTTP/WS endpoint intelligence-engine exposes: method, path, auth, request/response shape | API |
| [`../apps/intelligence-engine/src/README.md`](../apps/intelligence-engine/src/README.md) | intelligence-engine's internal file layout, current vs. planned module split | Component |
| [`../packages/api-contracts/README.md`](../packages/api-contracts/README.md) | Generated proto types + Zod schemas shared across apps — what's generated, why it's not wired into current routes yet | Component |
| [`TACTICAL_SCHEMA.md`](TACTICAL_SCHEMA.md) | Map visual design tokens (colors, typography) | Component (public-map) |
| [`product/VISION.md`](product/VISION.md) | Product/UX vision — mostly `PLANNED`, not an implementation spec | Product |
| [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md) | Log of non-obvious technical issues hit and how they were solved | Reference |

## Segregation model

Apps are independent and stay that way in docs too: each app's internal module docs live inside that app's own folder (e.g. `apps/intelligence-engine/src/*/README.md`), not under root `docs/`. Root `docs/` holds only what genuinely spans app boundaries — system topology (`architecture/OVERVIEW.md`), cross-app event flow (`architecture/DATA_FLOW.md`), and the per-app API index (`api/`). If you're documenting something entirely inside one app, put the doc inside that app; if you're documenting how apps fit together, it belongs here.

**Status/gap tracking specifically**: never track known gaps, TODOs, or a changelog-style checklist in root `README.md` — that file is a front door only. A gap in one app's behavior belongs in that app's own doc (e.g. a route's status lives in `api/<app>.md`, a module's known bug lives in that module's `README.md`). A gap that's genuinely cross-app (e.g. "no app has auth yet") belongs in `architecture/OVERVIEW.md` or `TECH_STACK.md`, not README.

## Ownership rule

**Every doc above is maintained by whoever touches the thing it describes — in the same change, not a follow-up.** Concretely:

- Add/change/remove an HTTP or WS route → update that app's file under `api/` in the same commit.
- Change how events flow between components, add a new event source, change the confidence-scoring inputs → update `architecture/DATA_FLOW.md`.
- Change which service owns what, add a new app, change a port/datastore → update `architecture/OVERVIEW.md`.
- Add/move/rename files inside `apps/intelligence-engine/src/` → update that app's `src/README.md`.

A doc that isn't true is worse than no doc — if you can't update it accurately in the same change, say so explicitly in the diff instead of leaving it stale.

## Status labels

Docs in this repo are pre-implementation in places (the project is still early). Every doc uses these labels so a reader — human or agent — never has to guess what's real:

- **CURRENT** — true of the code today, verified against it.
- **PLANNED** — designed, not yet built. Do not assume it exists.
- **STALE / KNOWN-WRONG** — flagged explicitly when a doc claim was checked against code and found false, until fixed.
- **PROPOSED** — a major architecture/tech change (see [`architecture/TECH_STACK.md`](architecture/TECH_STACK.md) for what qualifies), written up but not yet confirmed by the user. Do not implement anything labeled `PROPOSED`.
