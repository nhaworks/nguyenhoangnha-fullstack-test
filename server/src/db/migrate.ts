import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import mysql from 'mysql2/promise';
import { DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER } from '../config.js';

export async function migrateDatabase() {
  if (!/^\w+$/.test(DB_NAME)) {
    throw new Error(`DB_NAME không hợp lệ: "${DB_NAME}"`);
  }

  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    charset: 'utf8mb4',
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
    );
    await connection.changeUser({ database: DB_NAME });

    const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url));
    await migrate(drizzle(connection), { migrationsFolder });
  } finally {
    await connection.end();
  }
}

const isRunDirectly = process.argv[1] === fileURLToPath(import.meta.url);
if (isRunDirectly) {
  await migrateDatabase();
  console.log(`Database "${DB_NAME}" đã được cập nhật`);
}
