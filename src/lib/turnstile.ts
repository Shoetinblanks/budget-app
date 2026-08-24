export async function verifyTurnstileToken(token?: string): Promise<boolean> {
  if (!token) return false;

  const secretKey = process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA';

  // Always-pass test keys for local development and testing
  if (secretKey.startsWith('1x000000') || token.startsWith('XXXX.')) {
    return true;
  }

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    const data = await res.json();
    return !!data.success;
  } catch (error) {
    console.error('[Turnstile Verification Error]:', error);
    return false;
  }
}
