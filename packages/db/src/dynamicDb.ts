import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Connection pool cache mapping database connection strings to active Drizzle instances
const pools: Record<string, ReturnType<typeof drizzle<typeof schema>>> = {};

export function getTenantDb(connectionString: string) {
  // Return cached connection if available
  if (pools[connectionString]) {
    return pools[connectionString];
  }

  // Create new active connection pool and cache it
  const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10
  });

  const dbInstance = drizzle(client, { schema });
  pools[connectionString] = dbInstance;
  return dbInstance;
}
