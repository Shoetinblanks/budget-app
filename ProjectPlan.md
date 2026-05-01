# Personal Finance & Budget Management Platform
**Legal Owner:** Shoetinblanks LLC
**Stack:** Next.js 14 (App Router), Supabase (Auth/PostgreSQL), Vercel, Plaid API
**Domain:** budget.shoetinblanks.com

## Phase 1: Core Foundation & Multi-User Architecture
* **Supabase Setup:** Initialize tables with Row Level Security (RLS) enforcing strict data isolation per user.
* **Authentication:** Implement Google OAuth alongside standard email/password login.
* **Schema Creation:** * `profiles` (User settings: custom pay frequencies, default rounding rules).
  * `accounts` (Checking, Savings, Credit Cards).
  * `expenses` (The master budget list).
  * `transactions` (Linked to accounts).
* **Testing:** Generate a complete manual test plan validating Google Auth and RLS policies.

## Phase 2: The Budget Engine & Profile Settings
* **User Profile Settings UI:** Allow each user to define their global `pay_frequency` (e.g., bi-weekly, weekly, 1st/15th) and their `round_up_amount` (e.g., round to nearest $10).
* **Expenses Ledger:** CRUD interface for budget items (Name, Amounts, Category, Fixed/Variable, Due Date).
* **Dynamic Direct Deposit Routing:** Calculate required funding per account based on the user's specific pay frequency and rounding rules stored in their profile.
* **Testing:** Generate a test plan validating that different user profiles yield different direct deposit rounding math.

## Phase 3: Transaction Management & Bank Sync
* **Manual Import:** CSV parser to upload bank statements manually.
* **Live Bank Sync (Plaid API):** Plaid Link integration for live transactions and balances.
* **Smart Categorization Engine:**
  * Auto-assign default categories based on merchant data.
  * **Self-Learning AI:** Track manual category overrides in a `category_rules` table to auto-categorize future imports based on individual user preferences.
* **Testing:** Generate a test plan to validate CSV parsing and the AI categorization override logic.

## Phase 4: Analytics & Visualizations
* **Budget vs. Actual Dashboard:** Compare live transaction spending against the budgeted `expenses` table.
* **Interactive Charts:** Recharts integration for pie/bar charts breaking down Fixed vs. Variable spending.
* **Testing:** Validate chart rendering with mock transaction data.

## Phase 5: Emergency Fund & Savings Goals
* **Fixed Bills Calculator:** Dynamically calculate 1-to-12 month emergency fund requirements based *only* on expenses marked as "Fixed".
* **Live Goal Tracking:** Link Plaid-connected savings accounts to show real-time progress against emergency fund requirements.

## Phase 6: Check Stub OCR & Summary Totals
* **Summary Dashboard:** View total Fixed, Variable, and Combined differences against average net pay.
* **Check Stub OCR:** Image/PDF upload parsing gross pay, taxes, and net pay directly into the database.