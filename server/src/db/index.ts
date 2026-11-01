import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER } from '../config.js';
import * as schema from './schema.js';

export const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  // Cùng collation với bảng, để so sánh chuỗi không phân biệt hoa thường và dấu
  charset: 'UTF8MB4_0900_AI_CI',
});

// Drizzle đọc cột TIMESTAMP theo giờ UTC, nên mỗi kết nối phải chạy ở UTC (nếu không sẽ lệch 7 tiếng)
pool.on('connection', (conn) => conn.query("SET time_zone = '+00:00'"));

export const db = drizzle(pool, { schema, mode: 'default' });

// Kiểu của biến `tx` trong db.transaction(async (tx) => { ... })
export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
