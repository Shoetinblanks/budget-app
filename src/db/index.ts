import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { SocksClient } from 'socks';
import * as schema from './schema';

const connectionString =
  process.env.DATABASE_URL ||
  'postgres://postgres:postgres@127.0.0.1:5432/budget_app';

const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const socksProxy = process.env.ALL_PROXY || (process.env.TAILSCALE_AUTHKEY ? 'socks5://localhost:1055' : undefined);

const postgresOptions: postgres.Options<{}> = {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 30,
};

if (socksProxy) {
  (postgresOptions as any).socket = async (options: any) => {
    const rawHost = Array.isArray(options.host) ? options.host[0] : options.host;
    const rawPort = Array.isArray(options.port) ? options.port[0] : options.port;
    const targetHost = String(rawHost || '127.0.0.1');
    const targetPort = Number(rawPort) || 5432;

    const proxyUrl = socksProxy.startsWith('socks5://') ? socksProxy.replace('socks5://', 'http://') : socksProxy;
    let proxyHost = '127.0.0.1';
    let proxyPort = 1055;
    try {
      const parsed = new URL(proxyUrl.startsWith('http') ? proxyUrl : `http://${proxyUrl}`);
      proxyHost = parsed.hostname || '127.0.0.1';
      proxyPort = parseInt(parsed.port || '1055', 10);
    } catch {}

    let lastErr: any;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const info = await SocksClient.createConnection({
          proxy: {
            host: proxyHost,
            port: proxyPort,
            type: 5,
          },
          command: 'connect',
          destination: {
            host: targetHost,
            port: targetPort,
          },
          timeout: 10000,
        });
        return info.socket;
      } catch (err) {
        lastErr = err;
        await new Promise((r) => setTimeout(r, 250));
      }
    }
    throw lastErr;
  };
}

const conn = globalForDb.conn ?? postgres(connectionString, postgresOptions);
if (process.env.NODE_ENV !== 'production') globalForDb.conn = conn;

export const db = drizzle(conn, { schema });
export * from './schema';
