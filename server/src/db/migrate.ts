import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import mysql from 'mysql2/promise';
import { DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER } from '../config.js';

// Tạo database nếu chưa có, sau đó chạy các file migration trong drizzle/ còn thiếu
export async function migrateDatabase() {
  // Tên database được ghép thẳng vào câu SQL bên dưới, nên chỉ cho phép chữ, số và dấu _
  if (!/^\w+$/.test(DB_NAME)) {
    throw new Error(`DB_NAME không hợp lệ: "${DB_NAME}"`);
  }

  // Kết nối khi chưa chọn database, vì database có thể chưa tồn tại
  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    charset: 'UTF8MB4_0900_AI_CI',
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

// Chạy khi gọi `npm run db:migrate`. Khi test import file này thì đoạn dưới không chạy.
const isRunDirectly = process.argv[1] === fileURLToPath(import.meta.url);
if (isRunDirectly) {
  await migrateDatabase();
  console.log(`Database "${DB_NAME}" đã được cập nhật`);
}
