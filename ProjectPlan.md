# Personal Finance & Budget Management Platform (Multi-User)
**Legal Owner:** Shoetinblanks LLC
**Stack:** Next.js 14 (App Router), Supabase (Auth/PostgreSQL), Vercel, Plaid API
**Domain:** budget.shoetinblanks.com

## Phase 1: Multi-User Foundation & Authentication
* **Authentication:** Implement Google OAuth AND Email/Password via Supabase. Include "Forgot Password" and "Create Account" flows.
* **Global Privacy:** Enable Row Level Security (RLS) on all tables to ensure data isolation (users only see their own data).
* **User Profiles:** Create a `profiles` table to store `friendly_name`, `round_up_target`, and linked `income_sources`.
* **Status:** Complete ✅

## Phase 2: Navigation & Profile Architecture 
* **Global Navigation:** Sticky navbar that remains on scroll. Features a hamburger menu on mobile and a Gear icon on desktop (containing Profile, Settings, Sign Out). Menus must close on outside click.
* **Profile Management (`/account`):** Sidebar layout featuring:
  - **Profile:** Friendly Name (Nickname).
  - **Income Sources:** Ability to add multiple sources (Employer Name + Pay Frequency: Weekly, Bi-Weekly, 1st/15th, Monthly).
  - **System Defaults:** `round_up_target` input.
  - **Security:** Email/Password update fields ("Leave blank to keep current").
* **Status:** Current 🏗️
* **Test Plan:**
  - Verify clicking outside the Gear/Hamburger menu closes it.
  - Verify setting a Friendly Name saves to the database.

## Phase 3: Dynamic Budget Engine (Dashboard & Logic)
* **Spreadsheet Core (UI Tabs):** Scaffold the main views for Expenses, Summary Totals, Fixed Bills Emergency Fund (1-12 months), and Direct Deposit routing.
* **Expenses Ledger:** CRUD interface for budget items (Name, Monthly/Bi-weekly, Category, Fixed/Variable, Due Date).
* **Dynamic Math Engine:** - Logic must pull `round_up_target` and *all* `income_sources` from the logged-in user's profile.
  - Calculate required direct deposits for each account based on user-specific rounding rules and combined income frequencies.
* **Status:** Pending.
* **Test Plan:**
  - Add a second income source and verify bi-weekly amounts recalculate correctly.

## Phase 4: Transaction Management & Bank Sync
* **Manual Import:** CSV parser for manual statement uploads (Chase, Caesars, etc.).
* **Live Bank Sync:** Plaid API integration for live transactions and balances.
* **Smart Categorization (AI):** - Use a `category_rules` table to store manual user overrides.
  - Implement a learning logic: If a user changes a specific merchant category, the system defaults to that category for all future imports for that user.
* **Status:** Pending.
* **Test Plan:**
  - Import a CSV and verify categories are assigned.
  - Override a category and verify the next import of that merchant uses the new category.

## Phase 5: Analytics & Visualizations
* **Dashboard:** Summary of Net Pay vs. Expenses.
* **Charts:** Interactive Recharts for category breakdowns (Fixed vs. Variable).
* **Status:** Pending.
* **Test Plan:**
  - Verify pie chart accurately reflects the "Fixed" toggle in the Expenses table.

## Phase 6: Check Stub OCR & Advanced Totals
* **OCR Integration:** Allow upload of check stubs to auto-populate net pay, taxes, and deductions.
* **Summary Dashboard:** Comprehensive view of Yearly/Monthly/Bi-Weekly differences.
* **Status:** Pending.