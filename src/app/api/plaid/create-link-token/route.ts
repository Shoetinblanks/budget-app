import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode, LinkTokenCreateRequest } from 'plaid';
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

    const request: LinkTokenCreateRequest = {
      user: {
        // This should correspond to a unique id for the current user.
        client_user_id: user.id,
      },
      client_name: 'Budget App',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    };

    const createTokenResponse = await plaidClient.linkTokenCreate(request);
    
    return NextResponse.json(createTokenResponse.data);
  } catch (error: unknown) {
    console.error('Plaid Link Token Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Something went wrong' },
      { status: 500 }
    );
  }
}

