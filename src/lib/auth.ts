import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { emailOTP } from 'better-auth/plugins';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { sendEmail } from './email';

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET || '9efc28054cbbe742c3666b6c2cb1a8ef1f93fbd71bc9d4be2a7a4f91e98d97be',
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.authAccounts,
      verification: schema.verifications,
    },
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
});
