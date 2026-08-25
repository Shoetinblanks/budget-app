import fs from 'fs';
import path from 'path';
import postgres from 'postgres';

const env = process.argv[2] || 'test';
if (env !== 'test' && env !== 'prod') {
  console.error('Usage: node scripts/apply_migrations.mjs [test|prod]');
  process.exit(1);
}

// Read database URL from .env.test or .env.prod
const envFile = path.resolve(process.cwd(), `.env.${env}`);
if (!fs.existsSync(envFile)) {
  console.error(`❌ Environment file not found: ${envFile}`);
  process.exit(1);
}

const envContent = fs.readFileSync(envFile, 'utf8');
let dbUrl = '';
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed.startsWith('DATABASE_URL=')) {
    dbUrl = trimmed.replace('DATABASE_URL=', '').replace(/^["']|["']$/g, '');
    break;
  }
}

if (!dbUrl) {
  console.error(`❌ DATABASE_URL not found in ${envFile}`);
  process.exit(1);
}

console.log(`=================================================================`);
console.log(`🚀 Running Database Migrations for [${env}]...`);
console.log(`=================================================================`);

const sql = postgres(dbUrl, { max: 1, connect_timeout: 10 });

try {
  // Ensure _migrations table exists
  await sql`
    CREATE TABLE IF NOT EXISTS public._migrations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  const migrationsDir = path.resolve(process.cwd(), 'db/migrations');
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log(`ℹ️ No pending migration files found in db/migrations.`);
    console.log(`✅ Database is up to date.`);
    await sql.end();
    process.exit(0);
  }

  const appliedRows = await sql`SELECT name FROM public._migrations`;
  const appliedSet = new Set(appliedRows.map(r => r.name));

  const newlyApplied = [];

  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`  [SKIP] ${file} (already applied)`);
      continue;
    }

    console.log(`  [APPLYING] ${file}...`);
    const filePath = path.join(migrationsDir, file);
    const sqlContent = fs.readFileSync(filePath, 'utf8');

    await sql.begin(async (tx) => {
      await tx.unsafe(sqlContent);
      await tx`INSERT INTO public._migrations (name) VALUES (${file})`;
    });

    console.log(`  ✅ Successfully applied ${file}`);
    newlyApplied.push(file);
  }

  if (env === 'prod' && newlyApplied.length > 0) {
    const archiveDir = path.resolve(process.cwd(), 'db/migrations_archive');
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }
    for (const file of newlyApplied) {
      const src = path.join(migrationsDir, file);
      const dest = path.join(archiveDir, file);
      fs.renameSync(src, dest);
      console.log(`  📦 Archived ${file} to db/migrations_archive/`);
    }
  }

  console.log(`=================================================================`);
  console.log(`🎉 All migrations processed successfully for [${env}]!`);
  console.log(`=================================================================`);
} catch (err) {
  console.error(`❌ Migration failed:`, err);
  process.exit(1);
} finally {
  await sql.end();
}
