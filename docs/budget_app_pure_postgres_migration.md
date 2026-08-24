# Budget App Pure PostgreSQL & Better Auth Migration Guide

This document is the complete reference architecture and implementation guide for migrating **Shoe Budgeting (`budget-app`)** from Supabase to pure PostgreSQL, Drizzle ORM, Better Auth, and permanent Tailscale networking on Google Cloud Run.

---

## 1. Architecture & Infrastructure

```
┌─────────────────────────────────────────────────────────┐
│              Google Cloud Run (Serverless)              │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Next.js Standalone Application                    │  │
│  │  - Better Auth + Drizzle ORM                      │  │
│  │  - postgres.js with custom SOCKS5 socket factory  │  │
│  └────────────────────────┬──────────────────────────┘  │
│                           │ localhost:1055 (SOCKS5)     │
│  ┌────────────────────────▼──────────────────────────┐  │
│  │ Tailscale Daemon (Userspace Mode)                 │  │
│  │  - Tag: tag:cloudrun                              │  │
│  │  - Node: budget-staging / budget-prod             │  │
│  └────────────────────────┬──────────────────────────┘  │
└───────────────────────────┼─────────────────────────────┘
                            │ Encrypted Tailscale Mesh
┌───────────────────────────▼─────────────────────────────┐
│           Proxmox Self-Hosted PostgreSQL Nodes          │
│                                                         │
│  - Test DB: postgres-test (100.82.185.119:5432)         │
│    Database: budget_preview                             │
│                                                         │
│  - Prod DB: postgres-prod (100.87.87.58:5432)           │
│    Database: budget_app                                 │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Google Secret Manager: `SHARED_INFRA_SECRETS`

The `SHARED_INFRA_SECRETS` secret is shared across all applications on Google Cloud Run.

### Tailscale Access Controls (ACLs) Rule:
Because Cloud Run nodes run with `tag:cloudrun` (`tagged-devices`), Tailscale requires an access grant in **Tailscale Admin Console -> Access Controls (Policies)**:
* **Source**: `tag:cloudrun`
* **Destination**: `All users and devices` (`*`)
* **JSON**:
  ```json
  {
    "src": ["tag:cloudrun"],
    "dst": ["*"],
    "ip": ["*"]
  }
  ```
*(This is a one-time setup that applies globally to all Cloud Run apps).*

### Secret Content (`secrets/SHARED_INFRA_SECRETS.env`):
```env
# Tailscale Networking
TAILSCALE_AUTHKEY=tskey-auth-yourTailscaleAuthKeyHere
TAILSCALE_TAGS=tag:cloudrun

# PostgreSQL Database Nodes
DB_HOST_TEST=100.82.185.119
DB_HOST_PROD=100.87.87.58
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_secure_db_password

# AWS SES Transactional Email
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-2
EMAIL_FROM=Shoetinblanks <noreply@shoetinblanks.com>

# Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_turnstile_site_key
TURNSTILE_SECRET_KEY=your_turnstile_secret_key
```

### To Update `SHARED_INFRA_SECRETS` in GSM:
```bash
gcloud secrets versions add SHARED_INFRA_SECRETS --data-file=secrets/SHARED_INFRA_SECRETS.env
```

---

## 3. Step-by-Step Migration Implementation

### Step 3.1: Remove Supabase & Install Modern Packages
```bash
# 1. Uninstall legacy Supabase
npm uninstall @supabase/supabase-js @supabase/ssr

# 2. Install ORM, Auth, Networking & Email SDKs
npm install better-auth @better-auth/drizzle-adapter drizzle-orm postgres socks @aws-sdk/client-ses
npm install -D drizzle-kit
```

### Step 3.2: Configure Drizzle ORM (`drizzle.config.ts`)
```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://postgres:password@100.82.185.119:5432/budget_preview',
  },
});
```

### Step 3.3: Drizzle Connection with Tailscale SOCKS5 Proxy (`src/db/index.ts`)
```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { SocksClient } from 'socks';
import * as schema from './schema';

const connectionString =
  process.env.DATABASE_URL ||
  'postgres://postgres:password@100.82.185.119:5432/budget_preview';

const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const socksProxy = process.env.ALL_PROXY || (process.env.TAILSCALE_AUTHKEY ? 'socks5://localhost:1055' : undefined);

const postgresOptions: postgres.Options<{}> = {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 30,
};

// Route through userspace Tailscale proxy on Cloud Run
if (socksProxy) {
  (postgresOptions as any).socket = async (options: any) => {
    const rawHost = Array.isArray(options.host) ? options.host[0] : options.host;
    const rawPort = Array.isArray(options.port) ? options.port[0] : options.port;
    const targetHost = String(rawHost || '127.0.0.1');
    const targetPort = Number(rawPort) || 5432;

    const proxyUrl = socksProxy.startsWith('socks5://') ? socksProxy.replace('socks5://', 'http://') : socksProxy;
    let proxyHost = '127.0.0.1';
    let proxyPort = 1055;
    try {
      const parsed = new URL(proxyUrl.startsWith('http') ? proxyUrl : `http://${proxyUrl}`);
      proxyHost = parsed.hostname || '127.0.0.1';
      proxyPort = parseInt(parsed.port || '1055', 10);
    } catch {}

    const info = await SocksClient.createConnection({
      proxy: {
        host: proxyHost,
        port: proxyPort,
        type: 5,
      },
      command: 'connect',
      destination: {
        host: targetHost,
        port: targetPort,
      },
    });

    return info.socket;
  };
}

const conn = globalForDb.conn ?? postgres(connectionString, postgresOptions);
if (process.env.NODE_ENV !== 'production') globalForDb.conn = conn;

export const db = drizzle(conn, { schema });
export * from './schema';
```

### Step 3.4: Better Auth Schema Definition (`src/db/schema.ts`)
```typescript
import { pgTable, text, timestamp, boolean, integer, numeric, uuid } from 'drizzle-orm/pg-core';

// Better Auth Standard Core Tables
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
export const users = user;

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
});
export const sessions = session;

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
export const authAccounts = account;

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
export const verifications = verification;
```

---

## 4. AWS SES & Better Auth Configuration

### Step 4.1: AWS SES Dispatcher (`src/lib/email.ts`)
```typescript
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const sesClient = new SESClient({
  region: process.env.AWS_REGION || "us-east-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const fromEmail = process.env.EMAIL_FROM || "Shoetinblanks <noreply@shoetinblanks.com>";

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.warn(`[AWS SES] Credentials not set. Simulating email to ${to}: "${subject}"`);
    return;
  }

  const command = new SendEmailCommand({
    Source: fromEmail,
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Subject: { Data: subject },
      Body: {
        Html: { Data: html },
      },
    },
  });

  return sesClient.send(command);
}
```

### Step 4.2: Better Auth Server (`src/lib/auth.ts`)
```typescript
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { emailOTP } from 'better-auth/plugins';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { sendEmail } from './email';

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET || '9efc28054cbbe742c3666b6c2cb1a8ef1f93fbd71bc9d4be2a7a4f91e98d97be',
  trustedOrigins: [
    'http://localhost:3000',
    'https://test.budget.shoetinblanks.com',
    'https://test-budget.shoetinblanks.com',
    'https://budget-app-test-43989118408.us-west1.run.app',
    'https://budget.shoetinblanks.com',
  ],
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: schema,
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: 'Reset your password - Shoe Budgeting',
        html: `<p>Click <a href="${url}">here</a> to reset your password.</p>`,
      });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      scope: ['openid', 'profile', 'email'],
    },
  },
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        await sendEmail({
          to: email,
          subject: `Your Shoe Budgeting verification code: ${otp}`,
          html: `<p>Your verification code for <strong>${type}</strong> is: <h2>${otp}</h2></p>`,
        });
      },
    }),
  ],
});
```

### Step 4.3: Better Auth API Route (`src/app/api/auth/[...all]/route.ts`)
```typescript
import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

export const { GET, POST } = toNextJsHandler(auth);
```

### Step 4.4: Better Auth Client (`src/lib/auth-client.ts`)
```typescript
import { createAuthClient } from 'better-auth/react';
import { emailOTPClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'),
  plugins: [emailOTPClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

### Step 4.5: Login Page & OAuth Navigation Flow (`src/app/login/page.tsx`)
> ⚠️ **CRITICAL UX & ROUTING GOTCHA**:
> 1. Always use `useSession()` to immediately redirect an already-authenticated user to `/dashboard`.
> 2. When calling `signIn.social()`, check for `res?.data?.url` and explicitly set `window.location.href = res.data.url` to guarantee immediate navigation to the OAuth provider.

```typescript
'use client'

import { useState, useEffect } from 'react'
import { signIn, useSession } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { data: session } = useSession()

  // Automatically forward authenticated users
  useEffect(() => {
    if (session) {
      router.push('/dashboard')
    }
  }, [session, router])

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await signIn.social({
        provider: 'google',
        callbackURL: '/dashboard',
      })

      if (res?.error) {
        setError(res.error.message || 'Failed to sign in with Google.')
        setLoading(false)
      } else if (res?.data?.url) {
        window.location.href = res.data.url
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to sign in with Google.')
      setLoading(false)
    }
  }

  // ... rest of form
}
```

---

## 5. Cloudflare Turnstile Bot Protection

### Step 5.1: Turnstile Server Verification (`src/lib/turnstile.ts`)
```typescript
export async function verifyTurnstileToken(token?: string): Promise<boolean> {
  if (!token) return false;
  const secretKey = process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA';
  if (secretKey.startsWith('1x000000') || token.startsWith('XXXX.')) return true;

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: secretKey, response: token }),
    });
    const data = await res.json();
    return !!data.success;
  } catch {
    return false;
  }
}
```

### Step 5.2: Turnstile Widget Component (`src/components/TurnstileWidget.tsx`)
```typescript
'use client';
import { useEffect, useRef } from 'react';

export default function TurnstileWidget({ onVerify, className = 'my-4' }: { onVerify?: (token: string) => void; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';
    const renderWidget = () => {
      if (typeof window !== 'undefined' && (window as any).turnstile && containerRef.current) {
        if (widgetIdRef.current) {
          try { (window as any).turnstile.remove(widgetIdRef.current); } catch {}
        }
        containerRef.current.innerHTML = '';
        try {
          widgetIdRef.current = (window as any).turnstile.render(containerRef.current, {
            sitekey: siteKey,
            theme: 'dark',
            callback: (token: string) => { if (onVerify) onVerify(token); },
          });
        } catch {}
      }
    };

    if (typeof window !== 'undefined' && !(window as any).turnstile) {
      if (!document.getElementById('cf-turnstile-script')) {
        const script = document.createElement('script');
        script.id = 'cf-turnstile-script';
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.onload = renderWidget;
        document.head.appendChild(script);
      }
    } else {
      renderWidget();
    }
  }, [onVerify]);

  return (
    <div className={className}>
      <div ref={containerRef} className="min-h-[65px] flex items-center justify-center" />
    </div>
  );
}
```

---

## 6. Google Cloud Console OAuth Configuration

* **Project**: `shoebudget-app` (Project Number `180987478239`)
* **Client ID**: `your-client-id.apps.googleusercontent.com`
* **Client Secret**: `your-client-secret`

### Authorized JavaScript origins:
- `http://localhost:3000`
- `https://test.budget.shoetinblanks.com`
- `https://test-budget.shoetinblanks.com`
- `https://budget-app-test-43989118408.us-west1.run.app`
- `https://budget.shoetinblanks.com`

### Authorized redirect URIs:
- `http://localhost:3000/api/auth/callback/google`
- `https://test.budget.shoetinblanks.com/api/auth/callback/google`
- `https://test-budget.shoetinblanks.com/api/auth/callback/google`
- `https://budget-app-test-43989118408.us-west1.run.app/api/auth/callback/google`
- `https://budget.shoetinblanks.com/api/auth/callback/google`

---

## 7. App Secrets Management

### Staging Secret File: `secrets/BUDGET_TEST_SECRETS.env`
```env
DATABASE_URL=postgres://postgres:your_db_password@100.82.185.119:5432/budget_preview
BETTER_AUTH_SECRET=your_better_auth_secret_32_chars_min
BETTER_AUTH_URL=https://test.budget.shoetinblanks.com
NEXT_PUBLIC_APP_URL=https://test.budget.shoetinblanks.com

GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
PLAID_ENV=sandbox
PLAID_PRODUCTS=auth,transactions
PLAID_COUNTRY_CODES=US
```

### Production Secret File: `secrets/BUDGET_PROD_SECRETS.env`
```env
DATABASE_URL=postgres://postgres:your_db_password@100.87.87.58:5432/budget_app
BETTER_AUTH_SECRET=your_better_auth_secret_32_chars_min
BETTER_AUTH_URL=https://budget.shoetinblanks.com
NEXT_PUBLIC_APP_URL=https://budget.shoetinblanks.com

GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
PLAID_ENV=sandbox
PLAID_PRODUCTS=auth,transactions
PLAID_COUNTRY_CODES=US
```

---

## 8. Deployment Commands

### Deploy to Test Only:
```bash
./deploy_test.sh
# or
npm run deploy:test
```

### Deploy to Production When Ready:
```bash
# 1. Ensure production secrets are synced to Secret Manager:
gcloud secrets versions add BUDGET_PROD_SECRETS --data-file=secrets/BUDGET_PROD_SECRETS.env

# 2. Deploy to production Cloud Run:
./deploy_prod.sh
# or
npm run deploy:prod
```
