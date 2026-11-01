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
  charset: 'utf8mb4',
});

pool.on('connection', (conn) => conn.query("SET time_zone = '+00:00'"));

export const db = drizzle(pool, { schema, mode: 'default' });

export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
