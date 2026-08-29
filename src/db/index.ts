import postgres from 'postgres';

const connectionString =
  process.env.DATABASE_URL ||
  'postgres://postgres:postgres@127.0.0.1:5432/budget_app';

const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const postgresOptions: postgres.Options<{}> = {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 30,
  types: {
    date: {
      to: 1082,
      from: [1082],
      serialize: (x: any) => x,
      parse: (x: any) => x,
    },
  },
};

export const sql = globalForDb.conn ?? postgres(connectionString, postgresOptions);
if (process.env.NODE_ENV !== 'production') globalForDb.conn = sql;

export default sql;
