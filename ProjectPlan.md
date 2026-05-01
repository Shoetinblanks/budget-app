# Personal Finance & Budget Management Platform (Multi-User)
**Legal Owner:** Shoetinblanks LLC
**Stack:** Next.js 14 (App Router), Supabase (Auth/PostgreSQL), Vercel, Plaid API
**Domain:** budget.shoetinblanks.com

## Phase 1: Multi-User Foundation & Google Auth
* **Authentication:** Implement Google OAuth via Supabase.
* **Global Privacy:** Enable Row Level Security (RLS) on all tables to ensure data isolation (users only see their own data).
* **User Profiles:** Create a `profiles` table to store:
  - `pay_frequency` (Weekly, Bi-Weekly, 1st/15th, Monthly)
  - `round_up_target` (The dollar amount to round up to, e.g., $10)
* **Status:** Initializing.
* **Test Plan:**
  - Verify Google login redirects to the dashboard.
  - Verify that a user can save pay frequency and rounding rules.
  - Verify that data entered by User A is invisible to User B.

## Phase 2: Dynamic Budget Engine (Expenses & Direct Deposit)
* **Expenses Ledger:** CRUD interface for budget items (Name, Monthly/Bi-weekly, Category, Fixed/Variable, Due Date).
* **Dynamic Math Engine:** - Logic must pull `round_up_target` and `pay_frequency` from the logged-in user's profile.
  - Calculate required direct deposits for each account based on user-specific rounding rules.
* **Status:** Pending.
* **Test Plan:**
  - Update rounding from $10 to $1 and verify direct deposit totals update immediately.
  - Change pay frequency and verify bi-weekly amounts recalculate correctly.

## Phase 3: Transaction Management & Bank Sync
* **Manual Import:** CSV parser for manual statement uploads (Chase, Caesars, etc.).
* **Live Bank Sync:** Plaid API integration for live transactions and balances.
* **Smart Categorization (AI):** - Use a `category_rules` table to store manual user overrides.
  - Implement a learning logic: If a user changes a specific merchant category, the system defaults to that category for all future imports for that user.
* **Status:** Pending.
* **Test Plan:**
  - Import a CSV and verify categories are assigned.
  - Override a category and verify the next import of that merchant uses the new category.

## Phase 4: Analytics & Visualizations
* **Dashboard:** Summary of Net Pay vs. Expenses.
* **Charts:** Interactive Recharts for category breakdowns (Fixed vs. Variable).
* **Status:** Pending.
* **Test Plan:**
  - Verify pie chart accurately reflects the "Fixed" toggle in the Expenses table.

## Phase 5: Emergency Fund & Savings Goals
* **Fixed Bills Calculator:** Calculate 1-12 month emergency funds based strictly on items marked "Fixed" in the user's budget.
* **Status:** Pending.

## Phase 6: Check Stub OCR & Advanced Totals
* **OCR Integration:** Allow upload of check stubs to auto-populate net pay, taxes, and deductions.
* **Summary Dashboard:** Comprehensive view of Yearly/Monthly/Bi-Weekly differences.
* **Status:** Pending.