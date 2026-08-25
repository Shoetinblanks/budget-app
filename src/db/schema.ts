import { pgTable, text, timestamp, boolean, integer, numeric, uuid } from 'drizzle-orm/pg-core';

// ============================================================================
// Application Tables
// ============================================================================

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  friendlyName: text('friendly_name'),
  roundUpTarget: integer('round_up_target').default(10),
  incomeAvgMonths: integer('income_avg_months').default(12).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id'),
  accountCode: text('account_code'),
  name: text('name').notNull(),
  type: text('type'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id'),
  name: text('name').notNull(),
  color: text('color').default('#a1a1aa').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const categoryRules = pgTable('category_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id'),
  merchantPattern: text('merchant_pattern').notNull(),
  category: text('category').notNull(),
  subcategory: text('subcategory'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id'),
  customOrder: integer('custom_order'),
  name: text('name').notNull(),
  monthlyAmount: numeric('monthly_amount'),
  biWeeklyAmount: numeric('bi_weekly_amount'),
  category: text('category'),
  fixed: boolean('fixed').default(false),
  accountCode: text('account_code'),
  dueDate: text('due_date'),
  terms: text('terms'),
  notes: text('notes'),
  frequency: text('frequency').default('monthly'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const incomeSources = pgTable('income_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id'),
  employerName: text('employer_name').notNull(),
  payFrequency: text('pay_frequency').notNull(),
  payDate: text('pay_date'),
  netAmount: numeric('net_amount').default('0'),
  grossAmount: numeric('gross_amount').default('0'),
  taxes: numeric('taxes').default('0'),
  deductions: numeric('deductions').default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id'),
  transactionDate: text('transaction_date'),
  postDate: text('post_date'),
  description: text('description').notNull(),
  category: text('category'),
  subcategory: text('subcategory'),
  type: text('type'),
  amount: numeric('amount').notNull(),
  memo: text('memo'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const plaidItems = pgTable('plaid_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id'),
  accessToken: text('access_token').notNull(),
  itemId: text('item_id').notNull(),
  institutionName: text('institution_name'),
  syncCursor: text('sync_cursor'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
