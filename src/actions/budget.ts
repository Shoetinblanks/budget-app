'use server'

import { auth, currentUser } from '@clerk/nextjs/server';
import { sql } from '@/db';
import { DEFAULT_CATEGORIES, Account, Category, Expense, Transaction, IncomeSource, CategoryRule, Profile } from '@/app/types';
import { verifyTurnstileToken } from '@/lib/turnstile';

export async function validateTurnstile(token: string) {
  return verifyTurnstileToken(token);
}

async function getAuthSession() {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }
  const user = await currentUser();
  return { user: { id: userId, email: user?.primaryEmailAddress?.emailAddress || '' } };
}

export async function getDashboardData() {
  const session = await getAuthSession();
  if (!session) {
    return { authenticated: false };
  }

  const userId = session.user.id;

  const [rawProfiles, rawAccounts, rawExpenses, rawIncomeSources, rawTransactions, rawCategoryRules, rawCategories] =
    await Promise.all([
      sql`SELECT id, friendly_name, round_up_target, income_avg_months FROM profiles WHERE id = ${userId} LIMIT 1`,
      sql`SELECT id, user_id, account_code, name, type FROM accounts WHERE user_id = ${userId}`,
      sql`SELECT id, user_id, custom_order, name, monthly_amount, bi_weekly_amount, category, fixed, account_code, due_date, terms, notes, frequency FROM expenses WHERE user_id = ${userId} ORDER BY created_at DESC`,
      sql`SELECT id, user_id, employer_name, pay_frequency, pay_date, net_amount, gross_amount, taxes, deductions FROM income_sources WHERE user_id = ${userId} ORDER BY pay_date DESC NULLS LAST, created_at DESC`,
      sql`SELECT id, user_id, transaction_date, post_date, description, category, subcategory, type, amount, memo, created_at FROM transactions WHERE user_id = ${userId} ORDER BY transaction_date DESC NULLS LAST, created_at DESC`,
      sql`SELECT id, user_id, merchant_pattern, category, subcategory FROM category_rules WHERE user_id = ${userId}`,
      sql`SELECT id, user_id, name, color FROM categories WHERE user_id = ${userId} ORDER BY name ASC`,
    ]);

  let categories: Category[] = rawCategories.map((c: any) => ({
    id: c.id,
    user_id: c.user_id || undefined,
    name: c.name,
    color: c.color,
  }));

  // Seed default categories if none exist
  if (categories.length === 0) {
    const inserted = await sql`
      INSERT INTO categories ${sql(
        DEFAULT_CATEGORIES.map((c) => ({
          user_id: userId,
          name: c.name,
          color: c.color,
        }))
      )}
      RETURNING id, user_id, name, color
    `;

    categories = inserted.map((c: any) => ({
      id: c.id,
      user_id: c.user_id || undefined,
      name: c.name,
      color: c.color,
    }));
  }

  let profile: Profile | null = rawProfiles[0]
    ? {
        friendly_name: rawProfiles[0].friendly_name || undefined,
        round_up_target: rawProfiles[0].round_up_target ?? 10,
        income_avg_months: rawProfiles[0].income_avg_months ?? 12,
      }
    : null;

  if (!profile) {
    try {
      await sql`
        INSERT INTO profiles (id, round_up_target, income_avg_months)
        VALUES (${userId}, 10, 12)
        ON CONFLICT (id) DO NOTHING
      `;
      profile = {
        round_up_target: 10,
        income_avg_months: 12,
      };
    } catch (e) {
      console.error('Failed to auto-create profile:', e);
    }
  }

  const accounts: Account[] = rawAccounts.map((a: any) => ({
    id: a.id,
    user_id: a.user_id || undefined,
    name: a.name,
    account_code: a.account_code || '',
    type: a.type || undefined,
  }));

  const expenses: Expense[] = rawExpenses.map((e: any) => ({
    id: e.id,
    user_id: e.user_id || undefined,
    name: e.name,
    monthly_amount: parseFloat(e.monthly_amount || '0'),
    bi_weekly_amount: parseFloat(e.bi_weekly_amount || '0'),
    category: e.category || 'General',
    fixed: e.fixed ?? false,
    account_code: e.account_code || '',
    due_date: e.due_date || '',
    frequency: e.frequency || 'monthly',
    notes: e.notes || undefined,
  }));

  const incomeSources: IncomeSource[] = rawIncomeSources.map((i: any) => ({
    id: i.id,
    user_id: i.user_id || undefined,
    employer_name: i.employer_name,
    pay_frequency: i.pay_frequency,
    pay_date: i.pay_date || undefined,
    net_amount: parseFloat(i.net_amount || '0'),
    gross_amount: parseFloat(i.gross_amount || '0'),
    taxes: parseFloat(i.taxes || '0'),
    deductions: parseFloat(i.deductions || '0'),
  }));

  const transactions: Transaction[] = rawTransactions.map((t: any) => ({
    id: t.id,
    user_id: t.user_id || undefined,
    transaction_date: t.transaction_date || '',
    post_date: t.post_date || undefined,
    description: t.description,
    category: t.category || 'General',
    type: t.type || undefined,
    amount: parseFloat(t.amount || '0'),
    memo: t.memo || undefined,
    created_at: t.created_at ? new Date(t.created_at).toISOString() : undefined,
  }));

  const categoryRules: CategoryRule[] = rawCategoryRules.map((r: any) => ({
    id: r.id,
    user_id: r.user_id || undefined,
    merchant_pattern: r.merchant_pattern,
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

  const [rawProfiles, rawIncomes] = await Promise.all([
    sql`SELECT id, friendly_name, round_up_target, income_avg_months FROM profiles WHERE id = ${userId} LIMIT 1`,
    sql`SELECT id, user_id, employer_name, pay_frequency, pay_date, net_amount, gross_amount, taxes, deductions FROM income_sources WHERE user_id = ${userId} ORDER BY pay_date DESC NULLS LAST, created_at DESC`,
  ]);

  let profile: Profile | null = rawProfiles[0]
    ? {
        friendly_name: rawProfiles[0].friendly_name || undefined,
        round_up_target: rawProfiles[0].round_up_target ?? 10,
        income_avg_months: rawProfiles[0].income_avg_months ?? 12,
      }
    : null;

  if (!profile) {
    try {
      await sql`
        INSERT INTO profiles (id, round_up_target, income_avg_months)
        VALUES (${userId}, 10, 12)
        ON CONFLICT (id) DO NOTHING
      `;
      profile = {
        round_up_target: 10,
        income_avg_months: 12,
      };
    } catch (e) {
      console.error('Failed to auto-create profile:', e);
    }
  }

  const incomeSources: IncomeSource[] = rawIncomes.map((i: any) => ({
    id: i.id,
    user_id: i.user_id || undefined,
    employer_name: i.employer_name,
    pay_frequency: i.pay_frequency,
    pay_date: i.pay_date || undefined,
    net_amount: parseFloat(i.net_amount || '0'),
    gross_amount: parseFloat(i.gross_amount || '0'),
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
  const friendlyName = data.friendly_name || null;
  const roundUpTarget = data.round_up_target ?? 10;
  const incomeAvgMonths = data.income_avg_months ?? 12;

  await sql`
    INSERT INTO profiles (id, friendly_name, round_up_target, income_avg_months)
    VALUES (${userId}, ${friendlyName}, ${roundUpTarget}, ${incomeAvgMonths})
    ON CONFLICT (id) DO UPDATE SET
      friendly_name = EXCLUDED.friendly_name,
      round_up_target = EXCLUDED.round_up_target,
      income_avg_months = EXCLUDED.income_avg_months
  `;

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
    const payDate = s.pay_date || null;
    const gross = s.gross_amount !== undefined ? s.gross_amount.toString() : '0';
    const net = s.net_amount !== undefined ? s.net_amount.toString() : '0';
    const taxes = s.taxes !== undefined ? s.taxes.toString() : '0';
    const deductions = s.deductions !== undefined ? s.deductions.toString() : '0';

    if (s.id) {
      await sql`
        UPDATE income_sources SET
          employer_name = ${s.employer_name},
          pay_frequency = ${s.pay_frequency},
          pay_date = ${payDate},
          gross_amount = ${gross},
          net_amount = ${net},
          taxes = ${taxes},
          deductions = ${deductions}
        WHERE id = ${s.id} AND user_id = ${userId}
      `;
    } else {
      await sql`
        INSERT INTO income_sources (
          user_id, employer_name, pay_frequency, pay_date, gross_amount, net_amount, taxes, deductions
        ) VALUES (
          ${userId}, ${s.employer_name}, ${s.pay_frequency}, ${payDate}, ${gross}, ${net}, ${taxes}, ${deductions}
        )
      `;
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
  await sql`DELETE FROM income_sources WHERE id = ${id} AND user_id = ${session.user.id}`;
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

  const monthly = data.monthly_amount !== undefined ? data.monthly_amount.toString() : null;
  const biWeekly = data.bi_weekly_amount !== undefined ? data.bi_weekly_amount.toString() : null;
  const cat = data.category || 'General';
  const isFixed = data.fixed ?? false;
  const accCode = data.account_code || null;
  const dueDate = data.due_date || null;
  const freq = data.frequency || 'monthly';
  const notes = data.notes || null;

  if (data.id) {
    await sql`
      UPDATE expenses SET
        name = ${data.name},
        monthly_amount = ${monthly},
        bi_weekly_amount = ${biWeekly},
        category = ${cat},
        fixed = ${isFixed},
        account_code = ${accCode},
        due_date = ${dueDate},
        frequency = ${freq},
        notes = ${notes}
      WHERE id = ${data.id} AND user_id = ${userId}
    `;
  } else {
    await sql`
      INSERT INTO expenses (
        user_id, name, monthly_amount, bi_weekly_amount, category, fixed, account_code, due_date, frequency, notes
      ) VALUES (
        ${userId}, ${data.name}, ${monthly}, ${biWeekly}, ${cat}, ${isFixed}, ${accCode}, ${dueDate}, ${freq}, ${notes}
      )
    `;
  }

  return { success: true };
}

export async function deleteExpense(id: string) {
  const session = await getAuthSession();
  if (!session) throw new Error('Not authenticated');
  await sql`DELETE FROM expenses WHERE id = ${id} AND user_id = ${session.user.id}`;
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
  const accType = data.type || 'checking';

  if (data.id) {
    await sql`
      UPDATE accounts SET
        name = ${data.name},
        account_code = ${data.account_code},
        type = ${accType}
      WHERE id = ${data.id} AND user_id = ${userId}
    `;
  } else {
    await sql`
      INSERT INTO accounts (user_id, name, account_code, type)
      VALUES (${userId}, ${data.name}, ${data.account_code}, ${accType})
    `;
  }

  return { success: true };
}

export async function deleteAccount(id: string) {
  const session = await getAuthSession();
  if (!session) throw new Error('Not authenticated');
  await sql`DELETE FROM accounts WHERE id = ${id} AND user_id = ${session.user.id}`;
  return { success: true };
}

export async function saveCategory(data: { id?: string; name: string; color: string }) {
  const session = await getAuthSession();
  if (!session) throw new Error('Not authenticated');
  const userId = session.user.id;
  const catName = data.name.trim();

  if (data.id) {
    const updated = await sql`
      UPDATE categories SET
        name = ${catName},
        color = ${data.color}
      WHERE id = ${data.id} AND user_id = ${userId}
      RETURNING id, user_id, name, color
    `;
    return {
      category: updated[0]
        ? { id: updated[0].id, user_id: updated[0].user_id || undefined, name: updated[0].name, color: updated[0].color }
        : null,
    };
  } else {
    const inserted = await sql`
      INSERT INTO categories (user_id, name, color)
      VALUES (${userId}, ${catName}, ${data.color})
      RETURNING id, user_id, name, color
    `;
    return {
      category: inserted[0]
        ? { id: inserted[0].id, user_id: inserted[0].user_id || undefined, name: inserted[0].name, color: inserted[0].color }
        : null,
    };
  }
}

export async function deleteCategory(id: string) {
  const session = await getAuthSession();
  if (!session) throw new Error('Not authenticated');
  await sql`DELETE FROM categories WHERE id = ${id} AND user_id = ${session.user.id}`;
  return { success: true };
}

export async function saveCategoryRule(data: { id?: string; merchant_pattern: string; category: string }) {
  const session = await getAuthSession();
  if (!session) throw new Error('Not authenticated');
  const userId = session.user.id;

  if (data.id) {
    await sql`
      UPDATE category_rules SET
        merchant_pattern = ${data.merchant_pattern},
        category = ${data.category}
      WHERE id = ${data.id} AND user_id = ${userId}
    `;
  } else {
    await sql`
      INSERT INTO category_rules (user_id, merchant_pattern, category)
      VALUES (${userId}, ${data.merchant_pattern}, ${data.category})
    `;
  }

  return { success: true };
}

export async function deleteCategoryRule(id: string) {
  const session = await getAuthSession();
  if (!session) throw new Error('Not authenticated');
  await sql`DELETE FROM category_rules WHERE id = ${id} AND user_id = ${session.user.id}`;
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

  await sql`
    UPDATE transactions SET
      category = ${newCategory}
    WHERE id = ${transactionId} AND user_id = ${userId}
  `;

  if (matchingRuleId) {
    await sql`
      UPDATE category_rules SET
        category = ${newCategory}
      WHERE id = ${matchingRuleId} AND user_id = ${userId}
    `;
  }

  return { success: true };
}

export async function batchUpdateTransactionsCategory(updates: { id: string; category: string }[]) {
  const session = await getAuthSession();
  if (!session) throw new Error('Not authenticated');
  const userId = session.user.id;

  for (const update of updates) {
    await sql`
      UPDATE transactions SET
        category = ${update.category}
      WHERE id = ${update.id} AND user_id = ${userId}
    `;
  }

  return { success: true };
}

export async function deleteTransactions(ids: string[]) {
  const session = await getAuthSession();
  if (!session) throw new Error('Not authenticated');
  if (ids.length === 0) return { success: true };

  await sql`
    DELETE FROM transactions
    WHERE id IN ${sql(ids)} AND user_id = ${session.user.id}
  `;

  return { success: true };
}

export async function undoLastImport() {
  const session = await getAuthSession();
  if (!session) throw new Error('Not authenticated');
  const userId = session.user.id;

  const latest = await sql`
    SELECT created_at FROM transactions
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (latest && latest.length > 0 && latest[0].created_at) {
    const latestTime = new Date(latest[0].created_at);
    const windowStart = new Date(latestTime.getTime() - 5000);
    const windowEnd = new Date(latestTime.getTime() + 1000);

    const deleted = await sql`
      DELETE FROM transactions
      WHERE user_id = ${userId}
        AND created_at >= ${windowStart.toISOString()}
        AND created_at <= ${windowEnd.toISOString()}
      RETURNING id
    `;

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

  const existing = await sql`
    SELECT transaction_date, amount, description FROM transactions
    WHERE user_id = ${userId} AND transaction_date >= ${thirtyDaysAgo}
  `;

  const toInsert = items.filter((t) => {
    return !existing.some((e: any) => {
      const eDate = e.transaction_date ? new Date(e.transaction_date).toLocaleDateString() : '';
      const tDate = t.transaction_date ? new Date(t.transaction_date).toLocaleDateString() : '';
      return (
        eDate === tDate &&
        Math.abs(parseFloat(e.amount || '0') - t.amount) < 0.01 &&
        e.description.toLowerCase() === t.description.toLowerCase()
      );
    });
  });

  if (toInsert.length > 0) {
    await sql`
      INSERT INTO transactions ${sql(
        toInsert.map((t) => ({
          user_id: userId,
          transaction_date: t.transaction_date,
          post_date: t.post_date || null,
          description: t.description,
          category: t.category,
          type: t.type || null,
          amount: t.amount.toString(),
          memo: t.memo || null,
        }))
      )}
    `;
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
    await sql`
      INSERT INTO income_sources ${sql(
        sources.map((s) => ({
          user_id: userId,
          employer_name: s.employer_name,
          pay_date: s.pay_date || null,
          pay_frequency: s.pay_frequency,
          gross_amount: s.gross_amount !== undefined ? s.gross_amount.toString() : '0',
          net_amount: s.net_amount !== undefined ? s.net_amount.toString() : '0',
        }))
      )}
    `;
  }

  return { count: sources.length };
}
