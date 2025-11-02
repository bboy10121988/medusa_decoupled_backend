# Medusa v2 Google OAuth Configuration Issue

## Environment
- **Medusa Version**: v2 (latest)
- **Auth Provider**: `@medusajs/auth-google`
- **Deployment**: Production (PM2 on VM)
- **Issue**: `callbackUrl` not reading from environment variables at runtime

---

## Problem Description

I'm trying to configure Google OAuth for customer authentication in Medusa v2. The `callbackUrl` is not being updated from environment variables, even after rebuilding and restarting the service.

### Current Behavior

When I check the compiled configuration:
```bash
node -e "const config = require('./.medusa/server/medusa-config.js'); \
const googleAuth = config.modules.find(m => m.resolve === '@medusajs/auth')?.options?.providers?.find(p => p.id === 'google'); \
console.log('callbackUrl:', googleAuth?.options?.callbackUrl);"
```

Output:
```
callbackUrl: https://timsfantasyworld.com/auth/google/callback
```

But my `.env` file has:
```bash
GOOGLE_CALLBACK_URL=https://admin.timsfantasyworld.com/auth/customer/google/callback
```

### Expected Behavior

The `callbackUrl` should be:
```
https://admin.timsfantasyworld.com/auth/customer/google/callback
```

(Backend URL, not frontend URL)

---

## Configuration

### medusa-config.ts

```typescript
import { defineConfig, Modules } from "@medusajs/framework/utils"

// Helper function to get required environment variables
const requiredEnv = (key: string): string => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

export default defineConfig({
  projectConfig: {
    databaseUrl: requiredEnv('DATABASE_URL'),
    http: {
      storeCors: process.env.STORE_CORS || DEFAULT_STORE_CORS,
      adminCors: process.env.ADMIN_CORS || DEFAULT_ADMIN_CORS,
      authCors: process.env.AUTH_CORS || DEFAULT_AUTH_CORS,
      jwtSecret: 'medusa-jwt-secret-2024-production-key-secure',
      cookieSecret: 'medusa-cookie-secret-2024-production-key-secure',
    }
  },
  modules: [
    {
      resolve: '@medusajs/auth',
      options: {
        providers: [
          {
            resolve: '@medusajs/auth-emailpass',
            id: 'emailpass',
          },
          {
            resolve: '@medusajs/auth-google',
            id: 'google',
            options: {
              clientId: requiredEnv('GOOGLE_CLIENT_ID'),
              clientSecret: requiredEnv('GOOGLE_CLIENT_SECRET'),
              callbackUrl: requiredEnv('GOOGLE_CALLBACK_URL'),
              verify: async (container, req, accessToken, refreshToken, profile, done) => {
                // ... verify callback implementation
              }
            },
          },
        ],
      },
    },
    // ... other modules
  ]
})
```

### .env

```bash
GOOGLE_CLIENT_ID=273789094137-xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_CALLBACK_URL=https://admin.timsfantasyworld.com/auth/customer/google/callback
FRONTEND_URL=https://timsfantasyworld.com
```

### PM2 Configuration (ecosystem.config.js)

```javascript
module.exports = {
  apps: [
    {
      name: 'medusa-backend',
      script: 'yarn',
      args: 'dev',
      cwd: '/home/raychou/projects/backend',
      instances: 1,
      exec_mode: 'cluster',
      watch: false,
      env_file: '.env',
      env: {
        NODE_ENV: 'production',
        PORT: '9000'
      }
    }
  ]
}
```

---

## What I've Tried

### 1. Rebuild and restart
```bash
yarn build
pm2 restart medusa-backend --update-env
```
❌ Still shows old frontend URL

### 2. Check environment variables at runtime
```bash
pm2 env medusa-backend | grep GOOGLE
```
Output shows correct value:
```
GOOGLE_CALLBACK_URL=https://admin.timsfantasyworld.com/auth/customer/google/callback
```

### 3. Stop, delete, and restart PM2
```bash
pm2 delete medusa-backend
pm2 start ecosystem.config.js
```
❌ Still shows old frontend URL

### 4. Check compiled config
```bash
cat .medusa/server/medusa-config.js | grep -A 10 "auth-google"
```
The compiled file seems to have the old value hardcoded

---

## Questions

1. **Does `@medusajs/auth-google` read `callbackUrl` at build time or runtime?**
   - If build time: How do I make it read from environment variables at runtime?
   - If runtime: Why isn't it picking up the new value from `.env`?

2. **Is there a cache somewhere that needs to be cleared?**
   - I've tried deleting `node_modules/.cache` and `.medusa/server`
   - Still seeing the old URL

3. **Should I use a different approach to configure Google OAuth?**
   - Is there a programmatic way to override the callbackUrl?
   - Should I use middleware or custom routes instead?

4. **How does Medusa v2 load environment variables?**
   - Does it use `dotenv`?
   - When are environment variables loaded?
   - Are they cached somewhere?

---

## Current OAuth Flow

Right now, the OAuth flow is:

```
1. User clicks "Login with Google"
   → Frontend redirects to: /auth/customer/google

2. Backend generates Google OAuth URL
   → redirect_uri is set to: https://timsfantasyworld.com/auth/google/callback (WRONG)
   → Should be: https://admin.timsfantasyworld.com/auth/customer/google/callback

3. User authorizes on Google

4. Google redirects to frontend (wrong)
   → Frontend receives callback but can't handle it properly
   → Results in 401 Unauthorized when calling /auth/session
```

---

## Expected OAuth Flow

```
1. User clicks "Login with Google"
   → Frontend redirects to: /auth/customer/google

2. Backend generates Google OAuth URL
   → redirect_uri: https://admin.timsfantasyworld.com/auth/customer/google/callback

3. User authorizes on Google

4. Google redirects to BACKEND callback
   → Backend handles token exchange
   → Backend creates customer and session
   → Backend sets HTTP-only cookie
   → Backend redirects to frontend success page

5. User logged in successfully
```

---

## Additional Context

- Using custom callback route: `src/api/auth/customer/google/callback/route.ts`
- Google Cloud Console is configured with correct redirect URI
- This worked in development with `localhost`, but not in production
- Frontend and backend are on different subdomains:
  - Frontend: `https://timsfantasyworld.com`
  - Backend: `https://admin.timsfantasyworld.com`

---

## Request for Help

How can I ensure that `@medusajs/auth-google` uses the correct `callbackUrl` from environment variables in production?

Any guidance would be greatly appreciated! 🙏

---

## System Info

```bash
node -v    # v18.20.8
yarn -v    # 1.22.x
pm2 -v     # 5.x
```

**Operating System**: Linux (Ubuntu on Google Cloud VM)
**Deployment**: PM2 with ecosystem.config.js
