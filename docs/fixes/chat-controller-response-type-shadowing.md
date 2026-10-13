# Fix: Express Response Type Shadowing Global Fetch Response & Missing DOM Types in tsconfig.json

## Overview
During TypeScript compilation (`tsc`) in CI/Vercel environments, `src/controllers/chatController.ts` failed with 18 errors across all `fetch()` calls:
- `error TS2339: Property 'ok' does not exist on type 'Response'`
- `error TS2339: Property 'text' does not exist on type 'Response'`
- `error TS2339: Property 'status' does not exist on type 'Response'`
- `error TS2339: Property 'json' does not exist on type 'Response'`

## Root Cause Analysis
Two interconnected factors caused this issue:

1. **Express `Response` Shadowing**:
   In `src/controllers/chatController.ts`, importing `Response` directly from `'express'` shadowed the global Fetch API `Response` identifier in lexical scope.

2. **Conditional Type in `@types/node` when `"DOM"` was missing from `tsconfig.json`**:
   In `@types/node` (specifically `web-globals/fetch.d.ts`):
   ```typescript
   type _Response = typeof globalThis extends { onmessage: any } ? {} : undici.Response;
   ```
   `@types/node` uses `onmessage` detection on `globalThis` to determine whether DOM types are loaded. In CI environments like Vercel (or when ambient worker/global contexts exist), `onmessage` is present on `globalThis`. Because `tsconfig.json` only had `"lib": ["ES2022"]` without `"DOM"`, TypeScript never loaded `lib.dom.d.ts`. Consequently:
   - `@types/node` resolved `_Response` to `{}` (expecting `lib.dom.d.ts` to supply `Response`).
   - `lib.dom.d.ts` was not loaded to supply `Response`.
   - Result: Global `Response` became `{}` with zero properties (`ok`, `status`, `text()`, `json()` missing).

## Resolution
1. **Aliased Express `Response` in `src/controllers/chatController.ts`**:
   ```typescript
   import type { Request, Response as ExpressResponse } from 'express'
   ```
   Updated `sendMessage` and `getChatHistory` controller function signatures to use `ExpressResponse`.

2. **Added `"DOM"` to `tsconfig.json` `compilerOptions.lib`**:
   ```json
   "lib": ["ES2022", "DOM"]
   ```
   This ensures standard Fetch API Web API interfaces (`Response`, `Request`, `Headers`, etc.) from `lib.dom.d.ts` are explicitly loaded across all build environments (local, Vercel, Docker, CI).
