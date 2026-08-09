# API Docs Index

Each independently-deployable app that exposes an API gets its own file here — segregated per app, same as the apps themselves, so adding/changing one app's API never touches another's doc.

| App | API doc | Status |
|---|---|---|
| `apps/intelligence-engine` | [`intelligence-engine.md`](intelligence-engine.md) | CURRENT — only backend that exists today |
| `apps/public-map` | — | Consumes intelligence-engine's API, exposes none of its own |
| `apps/citizen-app` | not yet created | Will get its own file here once it exposes any API (unlikely — expected to be a pure client of intelligence-engine, same as public-map) |
| `apps/authority-portal` | not yet created | Same as above |

**Ownership rule**: if an app starts exposing its own API (not just consuming intelligence-engine's), give it a file here named after the app, and add a row above in the same change.

For how these APIs relate to each other — which app calls which, how an event crosses from one app's write to another app's read — see [`../architecture/DATA_FLOW.md`](../architecture/DATA_FLOW.md). This index tells you *where* each app's API is documented; that doc tells you how they fit together.
