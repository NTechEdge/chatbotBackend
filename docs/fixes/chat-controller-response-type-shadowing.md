# Fix: Express Response Type Shadowing Global Fetch Response

## Overview
During TypeScript compilation (`tsc`) in CI/Vercel environments, `src/controllers/chatController.ts` failed with errors:
- `error TS2339: Property 'ok' does not exist on type 'Response'`
- `error TS2339: Property 'text' does not exist on type 'Response'`
- `error TS2339: Property 'status' does not exist on type 'Response'`
- `error TS2339: Property 'json' does not exist on type 'Response'`

## Root Cause
In `src/controllers/chatController.ts`, importing `Response` directly from `'express'` shadowed the global Web API `Response` interface used by `fetch()`. Under strict NodeNext/ES2022 TypeScript resolution, the inferred return type `Promise<Response>` for `fetch(...)` resolved to the local Express `Response` instead of the global Web API `Response`. Express's `Response` does not possess Web API properties like `.ok`, `.text()`, etc.

## Resolution
1. Aliased the Express `Response` type import:
   ```typescript
   import type { Request, Response as ExpressResponse } from 'express'
   ```
2. Updated all Express controller signatures (`sendMessage`, `getChatHistory`) to use `res: ExpressResponse`.
3. Allowed `fetch()` responses to resolve to the global `Response` type without shadowing.
4. Preserved all runtime behavior and endpoint contracts.
