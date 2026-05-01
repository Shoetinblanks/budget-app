import { Configuration, PlaidApi, PlaidEnvironments, Transaction, RemovedTransaction } from 'plaid';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments] || PlaidEnvironments.development,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

export async function POST() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Get all linked Plaid items for this user
    const { data: items } = await supabase
      .from('plaid_items')
      .select('*')
      .eq('user_id', user.id);

    if (!items || items.length === 0) {
      return NextResponse.json({ message: 'No linked accounts found' }, { status: 200 });
    }

    let totalAdded = 0;

    for (const item of items) {
      const access_token = item.access_token;
      let cursor = item.sync_cursor;
      let hasMore = true;
      let added: Transaction[] = [];
      let modified: Transaction[] = [];
      let removed: RemovedTransaction[] = [];

      // Fetch all updates since the last cursor
      while (hasMore) {
        const response = await plaidClient.transactionsSync({
          access_token,
          cursor: cursor || undefined,
        });

        const data = response.data;
        added = added.concat(data.added);
        modified = modified.concat(data.modified);
        removed = removed.concat(data.removed);
        hasMore = data.has_more;
        cursor = data.next_cursor;
      }

      // Process Added Transactions
      if (added.length > 0) {
        const formattedTransactions = added.map((t) => ({
          user_id: user.id,
          transaction_date: t.date,
          post_date: t.authorized_date || t.date,
          description: t.merchant_name || t.name || 'Unknown Transaction',
          category: t.personal_finance_category?.primary || 'General',
          amount: t.amount, // Plaid amounts are positive for charges, negative for refunds (which is typical for budget apps)
          memo: `Plaid ID: ${t.transaction_id}`,
        }));

        // In a real app, apply Category Rules here similarly to the CSV import
        const { error: insertError } = await supabase
          .from('transactions')
          .insert(formattedTransactions);

        if (insertError) {
          console.error('Error inserting transactions:', insertError);
        } else {
          totalAdded += formattedTransactions.length;
        }
      }

      // Update the cursor in the database
      await supabase
        .from('plaid_items')
        .update({ sync_cursor: cursor })
        .eq('id', item.id);
    }

    return NextResponse.json({ success: true, added: totalAdded });
  } catch (error: unknown) {
    console.error('Plaid Sync Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Something went wrong' },
      { status: 500 }
    );
  }
}
