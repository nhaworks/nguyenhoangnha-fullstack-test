import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Đọc biến môi trường từ file server/.env (nếu có).
// Biến đã có sẵn trong môi trường (vd. do test đặt) sẽ không bị ghi đè.
const envFile = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

export const PORT = Number(process.env.PORT || 3000);

// Kết nối MySQL
export const DB_HOST = process.env.DB_HOST || '127.0.0.1';
export const DB_PORT = Number(process.env.DB_PORT || 3306);
export const DB_USER = process.env.DB_USER || 'root';
export const DB_PASSWORD = process.env.DB_PASSWORD || '';
export const DB_NAME = process.env.DB_NAME || 'template_library';

// Thư mục chứa file mẫu, ảnh preview và tài liệu của người dùng
export const STORAGE_ROOT = process.env.STORAGE_ROOT || fileURLToPath(new URL('../storage', import.meta.url));

// Chưa có đăng nhập nên mọi tài liệu đều thuộc user này (lưu ở storage/documents/<user>/)
export const DEFAULT_USER_ID = process.env.DEFAULT_USER_ID || 'demo';
