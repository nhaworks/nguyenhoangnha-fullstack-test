import { buildApp } from './app.js';
import { PORT } from './config.js';
import { seed } from './db/seed.js';

const app = buildApp();

try {
  // Nạp danh sách mẫu từ storage/templates/manifest.json vào DB trước khi nhận request
  await seed();
  await app.listen({ port: PORT });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
