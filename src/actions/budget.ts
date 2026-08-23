'use server'

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, and, desc, asc, inArray, gte, lte, sql } from 'drizzle-orm';
import { DEFAULT_CATEGORIES, Account, Category, Expense, Transaction, IncomeSource, CategoryRule, Profile } from '@/app/types';

async function getAuthSession() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({
    headers: reqHeaders,
  });
  if (!session?.user) {
    return null;
  }
  return session;
}

export async function getDashboardData() {
  const session = await getAuthSession();
  if (!session) {
    return { authenticated: false };
  }

  const userId = session.user.id;

  const [rawProfile, rawAccounts, rawExpenses, rawIncomeSources, rawTransactions, rawCategoryRules, rawCategories] =
    await Promise.all([
      db.select().from(schema.profiles).where(eq(schema.profiles.id, userId)).limit(1),
      db.select().from(schema.accounts).where(eq(schema.accounts.userId, userId)),
      db.select().from(schema.expenses).where(eq(schema.expenses.userId, userId)).orderBy(desc(schema.expenses.createdAt)),
      db.select().from(schema.incomeSources).where(eq(schema.incomeSources.userId, userId)).orderBy(desc(schema.incomeSources.payDate), desc(schema.incomeSources.createdAt)),
      db.select().from(schema.transactions).where(eq(schema.transactions.userId, userId)).orderBy(desc(schema.transactions.transactionDate), desc(schema.transactions.createdAt)),
      db.select().from(schema.categoryRules).where(eq(schema.categoryRules.userId, userId)),
      db.select().from(schema.categories).where(eq(schema.categories.userId, userId)).orderBy(asc(schema.categories.name)),
    ]);

  let categories: Category[] = rawCategories.map((c) => ({
    id: c.id,
    user_id: c.userId || undefined,
    name: c.name,
    color: c.color,
  }));

  // Seed default categories if none exist
  if (categories.length === 0) {
    const inserted = await db
      .insert(schema.categories)
      .values(
        DEFAULT_CATEGORIES.map((c) => ({
          userId,
          name: c.name,
          color: c.color,
        }))
      )
      .returning();

    categories = inserted.map((c) => ({
      id: c.id,
      user_id: c.userId || undefined,
      name: c.name,
      color: c.color,
    }));
  }

  const profile: Profile | null = rawProfile[0]
    ? {
        friendly_name: rawProfile[0].friendlyName || undefined,
        round_up_target: rawProfile[0].roundUpTarget ?? 10,
        income_avg_months: rawProfile[0].incomeAvgMonths ?? 12,
      }
    : null;

  const accounts: Account[] = rawAccounts.map((a) => ({
    id: a.id,
    user_id: a.userId || undefined,
    name: a.name,
    account_code: a.accountCode || '',
    type: a.type || undefined,
  }));

  const expenses: Expense[] = rawExpenses.map((e) => ({
    id: e.id,
    user_id: e.userId || undefined,
    name: e.name,
    monthly_amount: parseFloat(e.monthlyAmount || '0'),
    bi_weekly_amount: parseFloat(e.biWeeklyAmount || '0'),
    category: e.category || 'General',
    fixed: e.fixed ?? false,
    account_code: e.accountCode || '',
    due_date: e.dueDate || '',
    frequency: e.frequency || 'monthly',
    notes: e.notes || undefined,
  }));

  const incomeSources: IncomeSource[] = rawIncomeSources.map((i) => ({
    id: i.id,
    user_id: i.userId || undefined,
    employer_name: i.employerName,
    pay_frequency: i.payFrequency,
    pay_date: i.payDate || undefined,
    net_amount: parseFloat(i.netAmount || '0'),
    gross_amount: parseFloat(i.grossAmount || '0'),
    taxes: parseFloat(i.taxes || '0'),
    deductions: parseFloat(i.deductions || '0'),
  }));

  const transactions: Transaction[] = rawTransactions.map((t) => ({
    id: t.id,
    user_id: t.userId || undefined,
    transaction_date: t.transactionDate || '',
    post_date: t.postDate || undefined,
    description: t.description,
    category: t.category || 'General',
    type: t.type || undefined,
    amount: parseFloat(t.amount || '0'),
    memo: t.memo || undefined,
    created_at: t.createdAt ? t.createdAt.toISOString() : undefined,
  }));

  const categoryRules: CategoryRule[] = rawCategoryRules.map((r) => ({
    id: r.id,
    user_id: r.userId || undefined,
    merchant_pattern: r.merchantPattern,
    category: r.category,
  }));

  return {
    authenticated: true,
    user: session.user,
    profile,
    accounts,
    expenses,
    incomeSources,
    transactions,
    categoryRules,
    categories,
  };
}

export async function getAccountData() {
  const session = await getAuthSession();
  if (!session) {
    return { authenticated: false };
  }

  const userId = session.user.id;

  const [rawProfile, rawIncomes] = await Promise.all([
    db.select().from(schema.profiles).where(eq(schema.profiles.id, userId)).limit(1),
    db.select().from(schema.incomeSources).where(eq(schema.incomeSources.userId, userId)),
  ]);

  const profile: Profile | null = rawProfile[0]
    ? {
        friendly_name: rawProfile[0].friendlyName || undefined,
        round_up_target: rawProfile[0].roundUpTarget ?? 10,
        income_avg_months: rawProfile[0].incomeAvgMonths ?? 12,
      }
    : null;

  const incomeSources: IncomeSource[] = rawIncomes.map((i) => ({
    id: i.id,
    user_id: i.userId || undefined,
    employer_name: i.employerName,
    pay_frequency: i.payFrequency,
    pay_date: i.payDate || undefined,
    net_amount: parseFloat(i.netAmount || '0'),
    gross_amount: parseFloat(i.grossAmount || '0'),
    taxes: parseFloat(i.taxes || '0'),
    deductions: parseFloat(i.deductions || '0'),
  }));

  return {
    authenticated: true,
    user: session.user,
    profile,
    incomeSources,
  };
}

export async function saveProfile(data: {
  friendly_name?: string;
  round_up_target?: number;
  income_avg_months?: number;
}) {
  const session = await getAuthSession();
  if (!session) throw new Error('Not authenticated');

  const userId = session.user.id;

  await db
    .insert(schema.profiles)
    .values({
      id: userId,
      friendlyName: data.friendly_name || null,
      roundUpTarget: data.round_up_target ?? 10,
      incomeAvgMonths: data.income_avg_months ?? 12,
    })
    .onConflictDoUpdate({
      target: schema.profiles.id,
      set: {
        friendlyName: data.friendly_name || null,
        roundUpTarget: data.round_up_target ?? 10,
        incomeAvgMonths: data.income_avg_months ?? 12,
      },
    });

  return { success: true };
}

export async function saveIncomeSources(
  sources: {
    id?: string;
    employer_name: string;
    pay_frequency: string;
    pay_date?: string;
    gross_amount?: number;
    net_amount?: number;
    taxes?: number;
    deductions?: number;
  }[]
) {
  const session = await getAuthSession();
  if (!session) throw new Error('Not authenticated');
  const userId = session.user.id;

  for (const s of sources) {
    if (s.id) {
      await db
        .update(schema.incomeSources)
        .set({
          employerName: s.employer_name,
          payFrequency: s.pay_frequency,
          payDate: s.pay_date || null,
          grossAmount: s.gross_amount !== undefined ? s.gross_amount.toString() : '0',
          netAmount: s.net_amount !== undefined ? s.net_amount.toString() : '0',
          taxes: s.taxes !== undefined ? s.taxes.toString() : '0',
          deductions: s.deductions !== undefined ? s.deductions.toString() : '0',
        })
        .where(and(eq(schema.incomeSources.id, s.id), eq(schema.incomeSources.userId, userId)));
    } else {
      await db.insert(schema.incomeSources).values({
        userId,
        employerName: s.employer_name,
        payFrequency: s.pay_frequency,
        payDate: s.pay_date || null,
        grossAmount: s.gross_amount !== undefined ? s.gross_amount.toString() : '0',
        netAmount: s.net_amount !== undefined ? s.net_amount.toString() : '0',
        taxes: s.taxes !== undefined ? s.taxes.toString() : '0',
        deductions: s.deductions !== undefined ? s.deductions.toString() : '0',
      });
    }
  }

  return { success: true };
}

export async function saveIncomeSource(data: {
  id?: string;
  employer_name: string;
  pay_frequency: string;
  pay_date?: string;
  gross_amount?: number;
  net_amount?: number;
  taxes?: number;
  deductions?: number;
}) {
  return saveIncomeSources([data]);
}

export async function deleteIncomeSource(id: string) {
  const session = await getAuthSession();
  if (!session) throw new Error('Not authenticated');
  await db
    .delete(schema.incomeSources)
    .where(and(eq(schema.incomeSources.id, id), eq(schema.incomeSources.userId, session.user.id)));
  return { success: true };
}

export async function saveExpense(data: {
  id?: string;
  name: string;
  monthly_amount?: number;
  bi_weekly_amount?: number;
  category?: string;
  fixed?: boolean;
  account_code?: string;
  due_date?: string;
  frequency?: string;
  notes?: string;
}) {
  const session = await getAuthSession();
  if (!session) throw new Error('Not authenticated');
  const userId = session.user.id;

  if (data.id) {
    await db
      .update(schema.expenses)
      .set({
        name: data.name,
        monthlyAmount: data.monthly_amount !== undefined ? data.monthly_amount.toString() : null,
        biWeeklyAmount: data.bi_weekly_amount !== undefined ? data.bi_weekly_amount.toString() : null,
        category: data.category || 'General',
        fixed: data.fixed ?? false,
        accountCode: data.account_code || null,
        dueDate: data.due_date || null,
        frequency: data.frequency || 'monthly',
        notes: data.notes || null,
      })
      .where(and(eq(schema.expenses.id, data.id), eq(schema.expenses.userId, userId)));
  } else {
    await db.insert(schema.expenses).values({
      userId,
      name: data.name,
      monthlyAmount: data.monthly_amount !== undefined ? data.monthly_amount.toString() : null,
      biWeeklyAmount: data.bi_weekly_amount !== undefined ? data.bi_weekly_amount.toString() : null,
      category: data.category || 'General',
      fixed: data.fixed ?? false,
      accountCode: data.account_code || null,
      dueDate: data.due_date || null,
      frequency: data.frequency || 'monthly',
      notes: data.notes || null,
    });
  }

  return { success: true };
}

export async function deleteExpense(id: string) {
  const session = await getAuthSession();
  if (!session) throw new Error('Not authenticated');
  await db
    .delete(schema.expenses)
    .where(and(eq(schema.expenses.id, id), eq(schema.expenses.userId, session.user.id)));
  return { success: true };
}

export async function saveAccount(data: {
  id?: string;
  name: string;
  account_code: string;
  type?: string;
}) {
  const session = await getAuthSession();
  if (!session) throw new Error('Not authenticated');
  const userId = session.user.id;

  if (data.id) {
    await db
      .update(schema.accounts)
      .set({
        name: data.name,
        accountCode: data.account_code,
        type: data.type || 'checking',
      })
      .where(and(eq(schema.accounts.id, data.id), eq(schema.accounts.userId, userId)));
  } else {
    await db.insert(schema.accounts).values({
      userId,
      name: data.name,
      accountCode: data.account_code,
      type: data.type || 'checking',
    });
  }

  return { success: true };
}

export async function deleteAccount(id: string) {
  const session = await getAuthSession();
  if (!session) throw new Error('Not authenticated');
  await db
    .delete(schema.accounts)
    .where(and(eq(schema.accounts.id, id), eq(schema.accounts.userId, session.user.id)));
  return { success: true };
}

export async function saveCategory(data: { id?: string; name: string; color: string }) {
  const session = await getAuthSession();
  if (!session) throw new Error('Not authenticated');
  const userId = session.user.id;

  if (data.id) {
    const updated = await db
      .update(schema.categories)
      .set({
        name: data.name.trim(),
        color: data.color,
      })
      .where(and(eq(schema.categories.id, data.id), eq(schema.categories.userId, userId)))
      .returning();
    return {
      category: updated[0]
        ? { id: updated[0].id, user_id: updated[0].userId || undefined, name: updated[0].name, color: updated[0].color }
        : null,
    };
  } else {
    const inserted = await db
      .insert(schema.categories)
      .values({
        userId,
        name: data.name.trim(),
        color: data.color,
      })
      .returning();
    return {
      category: inserted[0]
        ? { id: inserted[0].id, user_id: inserted[0].userId || undefined, name: inserted[0].name, color: inserted[0].color }
        : null,
    };
  }
}

export async function deleteCategory(id: string) {
  const session = await getAuthSession();
  if (!session) throw new Error('Not authenticated');
  await db
    .delete(schema.categories)
    .where(and(eq(schema.categories.id, id), eq(schema.categories.userId, session.user.id)));
  return { success: true };
}

export async function saveCategoryRule(data: { id?: string; merchant_pattern: string; category: string }) {
  const session = await getAuthSession();
  if (!session) throw new Error('Not authenticated');
  const userId = session.user.id;

  if (data.id) {
    await db
      .update(schema.categoryRules)
      .set({
        merchantPattern: data.merchant_pattern,
        category: data.category,
      })
      .where(and(eq(schema.categoryRules.id, data.id), eq(schema.categoryRules.userId, userId)));
  } else {
    await db.insert(schema.categoryRules).values({
      userId,
      merchantPattern: data.merchant_pattern,
      category: data.category,
    });
  }

  return { success: true };
}

export async function deleteCategoryRule(id: string) {
  const session = await getAuthSession();
  if (!session) throw new Error('Not authenticated');
  await db
    .delete(schema.categoryRules)
    .where(and(eq(schema.categoryRules.id, id), eq(schema.categoryRules.userId, session.user.id)));
  return { success: true };
}

export async function updateTransactionCategory(
  transactionId: string,
  newCategory: string,
  matchingRuleId?: string
) {
  const session = await getAuthSession();
  if (!session) throw new Error('Not authenticated');
  const userId = session.user.id;

  await db
    .update(schema.transactions)
    .set({ category: newCategory })
    .where(and(eq(schema.transactions.id, transactionId), eq(schema.transactions.userId, userId)));

  if (matchingRuleId) {
    await db
      .update(schema.categoryRules)
      .set({ category: newCategory })
      .where(and(eq(schema.categoryRules.id, matchingRuleId), eq(schema.categoryRules.userId, userId)));
  }

  return { success: true };
}

export async function batchUpdateTransactionsCategory(updates: { id: string; category: string }[]) {
  const session = await getAuthSession();
  if (!session) throw new Error('Not authenticated');
  const userId = session.user.id;

  for (const update of updates) {
    await db
      .update(schema.transactions)
      .set({ category: update.category })
      .where(and(eq(schema.transactions.id, update.id), eq(schema.transactions.userId, userId)));
  }

  return { success: true };
}

export async function deleteTransactions(ids: string[]) {
  const session = await getAuthSession();
  if (!session) throw new Error('Not authenticated');
  if (ids.length === 0) return { success: true };

  await db
    .delete(schema.transactions)
    .where(and(inArray(schema.transactions.id, ids), eq(schema.transactions.userId, session.user.id)));

  return { success: true };
}

export async function undoLastImport() {
  const session = await getAuthSession();
  if (!session) throw new Error('Not authenticated');
  const userId = session.user.id;

  const latest = await db
    .select({ createdAt: schema.transactions.createdAt })
    .from(schema.transactions)
    .where(eq(schema.transactions.userId, userId))
    .orderBy(desc(schema.transactions.createdAt))
    .limit(1);

  if (latest && latest.length > 0 && latest[0].createdAt) {
    const latestTime = new Date(latest[0].createdAt);
    const windowStart = new Date(latestTime.getTime() - 5000);
    const windowEnd = new Date(latestTime.getTime() + 1000);

    const deleted = await db
      .delete(schema.transactions)
      .where(
        and(
          eq(schema.transactions.userId, userId),
          gte(schema.transactions.createdAt, windowStart),
          lte(schema.transactions.createdAt, windowEnd)
        )
      )
      .returning({ id: schema.transactions.id });

    return { count: deleted.length };
  }

  return { count: 0 };
}

export async function importTransactions(
  items: {
    transaction_date: string;
    post_date?: string;
    description: string;
    category: string;
    type?: string;
    amount: number;
    memo?: string;
  }[]
) {
  const session = await getAuthSession();
  if (!session) throw new Error('Not authenticated');
  const userId = session.user.id;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const existing = await db
    .select({
      transactionDate: schema.transactions.transactionDate,
      amount: schema.transactions.amount,
      description: schema.transactions.description,
    })
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.userId, userId),
        gte(schema.transactions.transactionDate, thirtyDaysAgo)
      )
    );

  const toInsert = items.filter((t) => {
    return !existing.some((e) => {
      const eDate = e.transactionDate ? new Date(e.transactionDate).toLocaleDateString() : '';
      const tDate = t.transaction_date ? new Date(t.transaction_date).toLocaleDateString() : '';
      return (
        eDate === tDate &&
        Math.abs(parseFloat(e.amount || '0') - t.amount) < 0.01 &&
        e.description.toLowerCase() === t.description.toLowerCase()
      );
    });
  });

  if (toInsert.length > 0) {
    await db.insert(schema.transactions).values(
      toInsert.map((t) => ({
        userId,
        transactionDate: t.transaction_date,
        postDate: t.post_date || null,
        description: t.description,
        category: t.category,
        type: t.type || null,
        amount: t.amount.toString(),
        memo: t.memo || null,
      }))
    );
  }

  return {
    importedCount: toInsert.length,
    skippedCount: items.length - toInsert.length,
  };
}

export async function importIncomeSources(
  sources: {
    employer_name: string;
    pay_date?: string;
    pay_frequency: string;
    gross_amount?: number;
    net_amount?: number;
  }[]
) {
  const session = await getAuthSession();
  if (!session) throw new Error('Not authenticated');
  const userId = session.user.id;

  if (sources.length > 0) {
    await db.insert(schema.incomeSources).values(
      sources.map((s) => ({
        userId,
        employerName: s.employer_name,
        payDate: s.pay_date || null,
        payFrequency: s.pay_frequency,
        grossAmount: s.gross_amount !== undefined ? s.gross_amount.toString() : '0',
        netAmount: s.net_amount !== undefined ? s.net_amount.toString() : '0',
      }))
    );
  }

  return { count: sources.length };
}
