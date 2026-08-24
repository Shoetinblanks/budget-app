import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { emailOTP } from 'better-auth/plugins';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { sendEmail } from './email';

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET || 'development-secret-key-at-least-32-chars-long',
  trustedOrigins: [
    'http://localhost:3000',
    'https://test.budget.shoetinblanks.com',
    'https://test-budget.shoetinblanks.com',
    'https://budget-app-test-43989118408.us-west1.run.app',
    'https://budget.shoetinblanks.com',
    'https://budget-app-43989118408.us-west1.run.app',
  ],
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: schema,
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: 'Reset your password - Shoe Budgeting',
        html: `<p>Hello,</p><p>Click <a href="${url}">here</a> to reset your password for Shoe Budgeting.</p>`,
      });
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: 'Verify your email address - Shoe Budgeting',
        html: `<p>Hello,</p><p>Click <a href="${url}">here</a> to verify your email address for Shoe Budgeting.</p>`,
      });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      scope: ['openid', 'profile', 'email'],
    },
  },
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        await sendEmail({
          to: email,
          subject: `Your Shoe Budgeting verification code: ${otp}`,
          html: `<p>Hello,</p><p>Your verification code for <strong>${type}</strong> is: <h2>${otp}</h2></p>`,
        });
      },
    }),
  ],
  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production',
    defaultCookieAttributes: {
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  },
});
