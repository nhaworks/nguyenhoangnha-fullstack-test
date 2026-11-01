import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const envFile = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

export const PORT = Number(process.env.PORT || 3000);

export const DB_HOST = process.env.DB_HOST || '127.0.0.1';
export const DB_PORT = Number(process.env.DB_PORT || 3306);
export const DB_USER = process.env.DB_USER || 'root';
export const DB_PASSWORD = process.env.DB_PASSWORD || '';
export const DB_NAME = process.env.DB_NAME || 'template_library';

export const STORAGE_ROOT = process.env.STORAGE_ROOT || fileURLToPath(new URL('../storage', import.meta.url));

export const DEFAULT_USER_ID = process.env.DEFAULT_USER_ID || 'demo';
