import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://postgres:1kFFNJvdhHAtVts6QSdBE2MYHXUpYnwfxzcxLftVhIY4FjdKYGAJVPfYeD5kh2KXcVtiRe@100.82.185.119:5432/budget_preview',
  },
});
