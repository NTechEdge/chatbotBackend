# Vercel Deployment & CORS Resolution Guide

## Problem Summary
When accessing the frontend deployed at `https://nixa-chat-bot.vercel.app` and connecting to the backend at `https://chatbot-backend-alpha-rouge.vercel.app`, login and registration failed with CORS errors:
- Browser error: `Access to fetch at ... blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.`
- Live backend curl test returned:
  ```
  HTTP/2 500
  x-vercel-error: FUNCTION_INVOCATION_FAILED
  ```

## Root Cause Analysis
1. **Uncommitted Vercel Serverless Entrypoint**:
   - `backend/api/index.js` and `backend/vercel.json` were untracked locally and never pushed to GitHub (`origin/main`).
   - The deployed backend on GitHub still ran standalone Node code with `dns.setServers` and `app.listen` inside `connectDB().finally()`, causing `FUNCTION_INVOCATION_FAILED` on every serverless invocation.
   - When Vercel crashes with a 500 gateway error, it does not send CORS headers, causing the browser to flag it as a CORS failure.
2. **CORS Origin Whitelist Restrictions**:
   - Previous origin validation only matched a rigid subdomain pattern.
   - Any Vercel preview branch or environment was subject to origin rejection.
3. **Database Readiness in Serverless Cold Starts**:
   - Under serverless execution, requests could reach route handlers before MongoDB finished connecting.
   - Mongoose buffered operations until execution timeouts were reached.

## Implemented Fixes
1. **Dynamic Vercel Origin Regex**:
   - Allowed all `*.vercel.app` domains (`/^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.vercel\.app$/i`) and local development ports.
2. **Dedicated Health Endpoints**:
   - Added `/` (root), `/health`, and `/api/health` returning live JSON status and `dbState` (`connected` or `disconnected`).
3. **Serverless DB Connection Middleware**:
   - Added an asynchronous connection middleware ensuring MongoDB connection is ready before handlers execute.
   - Handled concurrency gracefully so parallel cold starts do not create duplicate connections.
4. **Fast-Failure on DB Unavailability**:
   - If MongoDB connection is not established, `register` and `login` immediately respond with HTTP 503 and clear guidance rather than hanging and timing out.
5. **Vercel Serverless Configuration**:
   - Created `backend/vercel.json` and `backend/api/index.js` routing all requests to the Express application.

## Required Environment Variables & Settings
### 1. Vercel Backend (`chatbot-backend-alpha-rouge`)
- `PORT`: `5001`
- `MONGODB_URI`: `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority`
- `CLIENT_URL`: `https://nixa-chat-bot.vercel.app`
- `JWT_SECRET`: Random 64-char string

### 2. MongoDB Atlas Network Access
- In MongoDB Atlas Dashboard -> **Network Access** -> **IP Access List**:
  - Add `0.0.0.0/0` (Allow Access from Anywhere) to permit dynamic Vercel serverless IPs to connect.

### 3. Vercel Frontend (`nixa-chat-bot`)
- In Vercel Frontend Settings -> **Environment Variables**:
  - `VITE_API_URL`: `https://chatbot-backend-alpha-rouge.vercel.app/api`
- Trigger a **Redeploy** after setting `VITE_API_URL` so Vite bakes the live URL into the production bundle.
