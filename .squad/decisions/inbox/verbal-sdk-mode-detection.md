# Decision: SDK Mode Detection in Coordinator

**Author:** Verbal
**Date:** 2026-03-05
**Issue:** #194

## Context
The coordinator prompt (`squad.agent.md`) needs to detect when a project uses the SDK (`squad/*.ts` source files) vs. pure markdown mode, and adjust its behavior accordingly.

## Decision
SDK mode detection is a **session-start check** — the coordinator looks for `squad/` directory or `squad.config.ts` at the project root. When detected:

1. **Edit redirection**: structural changes go to `squad/*.ts`, not `.squad/*.md`
2. **Build reminder**: after modifying `squad/*.ts`, remind user to run `squad build`
3. **Config source**: prefer typed metadata from `defineAgent()` / `defineSquad()` over markdown parsing

## Principle
SDK mode *extends* markdown mode. Generated `.squad/` files are still the runtime format — the SDK adds a typed authoring layer on top. This means existing markdown-mode behavior is never broken, only augmented.

## Impact
All agents spawned by the coordinator inherit this awareness. No agent charter changes needed — the coordinator handles the mode switch and passes the appropriate paths.
