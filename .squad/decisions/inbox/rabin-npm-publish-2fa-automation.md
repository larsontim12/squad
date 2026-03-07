# npm Publish 2FA Automation Constraint

**Date:** 2026-03-07  
**Author:** Rabin  
**Status:** Documented constraint

## Problem

Attempted to publish squad-sdk@0.8.21 and squad-cli@0.8.21 to npm from local development environment. npm publish requires 2FA (one-time password) when using personal account authentication.

## Root Cause

- @bradygaster npm account has 2FA enabled (security best practice)
- User .npmrc contains legacy auth token: `//registry.npmjs.org/:_authToken`
- npm publish operations require OTP for accounts with 2FA
- No bypass available (by design — publish is sensitive operation)

## Manual Publish Commands

For local publish with 2FA:

```bash
# Get OTP from authenticator app
cd packages/squad-sdk && npm publish --access public --otp=<CODE>
cd packages/squad-cli && npm publish --access public --otp=<CODE>
```

## Implications for CI/CD

**Existing workflows (.github/workflows/):**
- `squad-publish.yml` — publishes on tag push
- `squad-insider-publish.yml` — publishes on insider branch

**These workflows MUST use:**
- `NPM_TOKEN` secret (automation/granular access token)
- NOT personal account token
- Automation tokens bypass 2FA requirement

**Verification needed:**
Check that GitHub Actions secrets include `NPM_TOKEN` with publish scope for automation.

## Decision

**For local manual publish:**  
Accept 2FA requirement. Use `--otp=<CODE>` flag with code from authenticator app.

**For CI/CD automation:**  
Verify workflows use automation token (`secrets.NPM_TOKEN`), not personal account token.

## Status

0.8.21 publish blocked on manual 2FA. Documented commands for Brady to complete with OTP.
