import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { setupTestApp } from './setup.js';

let testApp: Awaited<ReturnType<typeof setupTestApp>>;

before(async () => {
  testApp = await setupTestApp();
});

after(async () => {
  await testApp.cleanup();
});

describe('Tài liệu API (Swagger)', () => {
  test('GET /api/docs/json có đủ mọi endpoint, PUT lưu tài liệu nhận body là file .docx', async () => {
    const res = await testApp.app.inject({ method: 'GET', url: '/api/docs/json' });
    assert.equal(res.statusCode, 200);

    const spec = res.json();
    assert.match(spec.openapi, /^3\./);

    const operations = Object.entries(spec.paths).flatMap(([path, methods]) =>
      Object.keys(methods as object).map((method) => `${method.toUpperCase()} ${path}`),
    );
    assert.deepEqual(operations.sort(), [
      'GET /api/categories',
      'GET /api/documents',
      'GET /api/documents/{id}',
      'GET /api/documents/{id}/download',
      'GET /api/health',
      'GET /api/templates',
      'GET /api/templates/{id}',
      'GET /api/templates/{id}/file',
      'GET /files/previews/{*}',
      'PATCH /api/documents/{id}',
      'POST /api/templates/{id}/documents',
      'PUT /api/documents/{id}',
    ]);

    const saveBody = spec.paths['/api/documents/{id}'].put.requestBody.content;
    assert.deepEqual(Object.values(saveBody), [{ schema: { type: 'string', format: 'binary' } }]);
    assert.ok(spec.components.schemas.Document, 'có kiểu Document dùng chung');
  });

  test('GET /api/docs mở giao diện Swagger UI', async () => {
    const res = await testApp.app.inject({ method: 'GET', url: '/api/docs/' });
    assert.equal(res.statusCode, 200);
    assert.match(res.headers['content-type'] as string, /text\/html/);
  });
});
