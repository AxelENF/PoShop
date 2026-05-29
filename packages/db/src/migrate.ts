import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('🛑 Error: DATABASE_URL no está configurada en el entorno.');
  process.exit(1);
}

const migrationClient = postgres(connectionString, { max: 1 });
const db = drizzle(migrationClient);

async function main() {
  console.log('🔄 Iniciando migración de base de datos...');
  try {
    await migrate(db, { migrationsFolder: path.resolve(__dirname, '../drizzle') });
    console.log('✅ Migraciones aplicadas con éxito.');
  } catch (error) {
    console.error('🛑 Falló la migración:', error);
  } finally {
    await migrationClient.end();
  }
}

main();
