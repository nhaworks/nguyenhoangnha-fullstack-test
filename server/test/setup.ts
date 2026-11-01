import { existsSync } from 'node:fs';
import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDir = fileURLToPath(new URL('..', import.meta.url));

/**
 * Chuẩn bị môi trường test để không đụng dữ liệu thật:
 *   - Dùng database riêng: TEST_DB_NAME trong .env (mặc định template_library_test)
 *   - Copy storage/templates và storage/previews ra một thư mục tạm, test ghi file vào đó
 *
 * Lưu ý: src/config.ts đọc biến môi trường ngay lúc được import,
 * nên phải đặt biến môi trường xong rồi mới import code của app (dùng `await import(...)`).
 */
export async function setupTestApp() {
  // Đọc .env để lấy thông tin kết nối (host, user, password, TEST_DB_NAME)
  const envFile = path.join(serverDir, '.env');
  if (existsSync(envFile)) {
    process.loadEnvFile(envFile);
  }

  // Đổi sang database test và thư mục storage tạm
  process.env.DB_NAME = process.env.TEST_DB_NAME || 'template_library_test';

  const storageRoot = await mkdtemp(path.join(tmpdir(), 'template-library-test-'));
  await cp(path.join(serverDir, 'storage/templates'), path.join(storageRoot, 'templates'), { recursive: true });
  await cp(path.join(serverDir, 'storage/previews'), path.join(storageRoot, 'previews'), { recursive: true });
  process.env.STORAGE_ROOT = storageRoot;

  // Giờ mới import code của app
  const { migrateDatabase } = await import('../src/db/migrate.js');
  const { db, pool } = await import('../src/db/index.js');
  const { documents } = await import('../src/db/schema.js');
  const { seed } = await import('../src/db/seed.js');
  const { buildApp } = await import('../src/app.js');

  await migrateDatabase();
  await db.delete(documents); // xoá tài liệu của lần test trước
  await seed();

  const app = buildApp({ logger: false });

  async function cleanup() {
    await app.close();
    await pool.end();
    await rm(storageRoot, { recursive: true, force: true });
  }

  return { app, storageRoot, cleanup };
}
