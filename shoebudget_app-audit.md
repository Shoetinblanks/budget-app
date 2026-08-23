# Technical Audit: shoebudget-app
*Migration Assessment for Google Cloud Run & PostgreSQL*

## 1. Environment Variables
The following environment variables are required for both local development and production environments (secrets have been redacted):

**Supabase Configuration:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Plaid Configuration:**
- `PLAID_CLIENT_ID`
- `PLAID_SECRET`
- `PLAID_ENV` (e.g., `sandbox`, `development`, `production`)
- `PLAID_PRODUCTS` (e.g., `auth,transactions`)
- `PLAID_COUNTRY_CODES` (e.g., `US`)

## 2. Infrastructure & Deployment
- **Hosting**: Deployed on Google Cloud Run (`budget-app` and `budget-app-test`).
- **Database**: Self-hosted Supabase deployed on Google Compute Engine (`supabase-central-db`).
- **Secrets Management**: Managed via Google Secret Manager (`BUDGET_PROD_SECRETS` and `BUDGET_TEST_SECRETS`).
- **DNS**: Configured via Cloudflare:
  - Frontend: `budget.shoetinblanks.com` (Prod) & `test.budget.shoetinblanks.com` (Test) mapped to Cloud Run.
  - Supabase Backend API: `budget-api.shoetinblanks.com` (Prod, port 8002) & `test-budget-api.shoetinblanks.com` (Test, port 8005) routed via Cloudflare Tunnel to the self-hosted Supabase VM. Both using first-level subdomains to maintain full SSL coverage.

## 3. Next.js Features Used
- **Middleware:** **Yes**. Used primarily for Supabase authentication state management and session refreshes (`src/middleware.ts`).
- **Next.js Image Optimization:** **Yes**. `next/image` is utilized in components.
- **Server Actions:** **No**. Did not detect any `use server` directives in the codebase.
- **ISR (Incremental Static Regeneration):** **No**. Did not detect `revalidate` usage.

## 4. Database Client
- **Current Client:** The application connects to the database utilizing the native Supabase SDK (`@supabase/supabase-js` and `@supabase/ssr`).
- **ORMs:** There are no ORMs (like Prisma, Drizzle, or Kysely) or native Postgres drivers (e.g., `pg`) currently installed in the project. All queries and interactions rely on Supabase's PostgREST API wrapper.

## 5. Authentication & Storage
- **Authentication:** The project is deeply dependent on **Supabase Auth**. It leverages `@supabase/ssr` to orchestrate session tokens and validation between the server and client, utilizing Next.js middleware to manage access.
- **Storage:** No decoupled or independent storage solutions (like AWS S3) were detected. Any storage requirements are presumably handled within the Supabase ecosystem, as the `supabase-js` library has embedded storage capabilities.
