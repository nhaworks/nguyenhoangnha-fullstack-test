import { defineConfig } from 'drizzle-kit';
import { DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER } from './src/config.js';

export default defineConfig({
  dialect: 'mysql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASSWORD, database: DB_NAME },
});
