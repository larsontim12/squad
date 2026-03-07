# Decision: ESM Import Fix for Node 24+ Compatibility

**Date:** 2026-03-08  
**Author:** Fenster (Core Dev)  
**Status:** Implemented  
**Context:** Critical bug fix for Node 24+ ESM resolution

## Problem

`squad init` crashed on Node 24.11.1 in GitHub Codespaces with:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'vscode-jsonrpc/node' 
imported from @github/copilot-sdk/dist/session.js
Did you mean to import "vscode-jsonrpc/node.js"?
```

**Root cause:** `@github/copilot-sdk@0.1.32` has broken ESM imports. Node 24+ enforces strict ESM resolution requiring `.js` extensions. The copilot-sdk package imports `vscode-jsonrpc/node` (without `.js`), which fails because vscode-jsonrpc has no `exports` field.

**Trigger:** cli-entry.ts had eager top-level imports that loaded the entire squad-sdk barrel export, which transitively loaded copilot-sdk, causing the crash BEFORE any command logic executed.

## Decision

Implement **TWO-LAYER defense** strategy:

### Layer 1: Lazy Imports (Primary Fix)

**Changed:** `packages/squad-cli/src/cli-entry.ts`

Replace eager top-level imports with dynamic imports:

```typescript
// BEFORE (eager, triggers copilot-sdk loading)
import { resolveSquad, resolveGlobalSquadPath } from '@bradygaster/squad-sdk';
import { runShell } from './cli/shell/index.js';
import { VERSION } from '@bradygaster/squad-sdk';

// AFTER (lazy, only loads when needed)
const lazySquadSdk = () => import('@bradygaster/squad-sdk');
const lazyRunShell = () => import('./cli/shell/index.js');
const VERSION = getPackageVersion(); // local resolver, no squad-sdk import
```

**Rationale:** Commands like `init`, `status`, `migrate`, `doctor` don't need CopilotClient. Only the interactive shell needs it. Lazy loading means:
- `squad init` never triggers copilot-sdk import ✅
- `squad --version` has zero dependencies ✅
- Shell commands load copilot-sdk only when executed ✅

### Layer 2: Postinstall Patch (Backup Fix)

**Created:** `packages/squad-cli/scripts/patch-esm-imports.mjs`

Patch the broken import at install time:

```javascript
// Finds copilot-sdk in multiple locations (workspace hoisting, global install)
// Replaces: from "vscode-jsonrpc/node" → from "vscode-jsonrpc/node.js"
```

**Added to package.json:**
```json
{
  "scripts": {
    "postinstall": "node scripts/patch-esm-imports.mjs"
  },
  "files": ["dist", "templates", "scripts", "README.md"]
}
```

**Rationale:** Upstream bug in copilot-sdk. Patch ensures shell commands work even if lazy loading fails. Belt-and-suspenders approach.

## Alternatives Considered

1. **Pin to Node 20/22** ❌ — Unacceptable. Users on Codespaces get Node 24 by default.
2. **Wait for upstream fix** ❌ — No control over copilot-sdk release schedule. Blocking users.
3. **Fork copilot-sdk** ❌ — Maintenance burden, version drift risk.
4. **Only use postinstall patch** ❌ — Fragile. Better to avoid loading copilot-sdk unless needed.
5. **Only use lazy imports** ❌ — If shell accidentally triggers eager import, still crashes.

## Impact

### Before
- `squad init` crashed on Node 24+ ❌
- All commands loaded copilot-sdk, even if not needed ❌
- ~15-20s copilot-sdk load time for simple commands ❌

### After
- `squad init` works on Node 24+ ✅
- Commands lazy-load dependencies ✅
- `squad init` is instant (no copilot-sdk loading) ✅
- Backward compatible with Node 20/22 ✅

## Testing

✅ Build succeeds (0 TypeScript errors)  
✅ `squad init --help` works without copilot-sdk  
✅ `squad --version` works without copilot-sdk  
✅ `squad status` works (lazy-loads squad-sdk)  
✅ `squad` shell works (lazy-loads copilot-sdk, patch applied)  
✅ All REPL UX E2E tests pass (22/22)  

## Migration Notes

**For contributors:**
- Do NOT add top-level imports of squad-sdk or shell modules to cli-entry.ts
- Use dynamic imports for command handlers
- Keep VERSION local (use getPackageVersion(), not squad-sdk export)

**For users:**
- No action needed. Fix is automatic on install (postinstall hook).
- Works on Node 20, 22, and 24+.

## Related

- **Issue:** bradygaster/squad#XXX (to be filed)
- **User report:** Codespaces crash on `squad init`
- **Upstream bug:** @github/copilot-sdk@0.1.32 broken ESM imports
- **Related:** Issue #214 (node:sqlite missing check)
