# Fix: CORS Origin Configuration for Production Frontend

## Overview
When connecting the production frontend hosted at `https://nixa-chat-bot.vercel.app` to the backend, CORS requests failed due to origin matching constraints.

## Root Cause Analysis
1. **Trailing Slash Sensitivity**:
   If `CLIENT_URL` is set in hosting environment variables with a trailing slash (e.g. `https://nixa-chat-bot.vercel.app/`), standard string array comparison in `cors` fails because browsers send the `Origin` header without a trailing slash (`https://nixa-chat-bot.vercel.app`).
2. **Missing Production Defaults**:
   The default fallback origins only included local development addresses (`localhost:5173`, etc.).
3. **Vercel Preview Branch Deployments**:
   Vercel creates preview deployments with dynamic subdomains (e.g., `https://nixa-chat-bot-*.vercel.app`) which were rejected by exact string checks.
4. **Preflight Header Rejections**:
   `allowedHeaders` was restricted strictly to `Content-Type` and `Authorization`, rejecting requests with headers like `Accept`, `X-Requested-With`, or `Origin`.

## Resolution
1. **Origin Normalization**:
   Implemented a `normalizeOrigin` helper that trims whitespace, strips wrapping quotes, and removes trailing slashes.
2. **Production Default Origins**:
   Explicitly included `https://nixa-chat-bot.vercel.app` in `defaultOrigins` alongside localhost environments.
3. **Dynamic Origin Validator**:
   Configured a dynamic CORS origin callback that:
   - Permits requests without an origin (server-to-server, health checks, curl, mobile).
   - Validates against configured and default origins.
   - Matches Vercel preview deployments using regex (`/^https:\/\/nixa-chat-bot(-[a-z0-9-]+)?\.vercel\.app$/i`).
4. **Explicit OPTIONS Preflight Handling**:
   Configured `app.options('*', cors(corsOptions))` and expanded `allowedHeaders` to cover standard headers with `optionsSuccessStatus: 204`.
