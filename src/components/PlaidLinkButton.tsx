'use client'

import React, { useCallback, useState, useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { Landmark, Loader2 } from 'lucide-react';

export default function PlaidLinkButton({ onSuccess }: { onSuccess: () => void }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const createLinkToken = async () => {
      try {
        const response = await fetch('/api/plaid/create-link-token', {
          method: 'POST',
        });
        const data = await response.json();
        
        if (response.ok && data.link_token) {
          setToken(data.link_token);
        } else {
          console.error('Plaid Token Error:', data.error || 'Failed to get link token');
        }
      } catch (error) {
        console.error('Error creating link token:', error);
      } finally {
        setToken((prev) => prev); // trigger re-render if needed
        setLoading(false);
      }
    };
    createLinkToken();
  }, []);

  const handleOnSuccess = useCallback(async (public_token: string, metadata: import('react-plaid-link').PlaidLinkOnSuccessMetadata) => {
    try {
      const response = await fetch('/api/plaid/exchange-public-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          public_token,
          institution_name: metadata.institution?.name,
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        console.error('Error exchanging public token:', await response.json());
      }
    } catch (error) {
      console.error('Error in onSuccess handler:', error);
    }
  }, [onSuccess]);

  const { open, ready } = usePlaidLink({

    token,
    onSuccess: handleOnSuccess,
  });

  console.log('Plaid State:', { hasToken: !!token, loading, ready });


  return (
    <button
      onClick={() => {
        console.log('Link button clicked. Ready:', ready);
        if (ready) open();
      }}
      disabled={!ready || loading}
      className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2.5 px-5 rounded-xl transition-all flex items-center gap-2 border border-zinc-700 disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Landmark className="w-5 h-5" />}
      Link Bank Account
    </button>
  );
}
