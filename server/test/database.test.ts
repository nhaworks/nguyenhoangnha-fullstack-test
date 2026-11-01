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

async function loadDb() {
  const { eq } = await import('drizzle-orm');
  const { db } = await import('../src/db/index.js');
  const schema = await import('../src/db/schema.js');
  const { seed } = await import('../src/db/seed.js');
  return { eq, db, seed, ...schema };
}

describe('Khoá chính id tự tăng', () => {
  test('tài liệu có id số tự tăng không trùng, API chỉ trả uuid; khoá ngoại trỏ id số của mẫu', async () => {
    const { eq, db, documents, templates } = await loadDb();

    const first = (await testApp.app.inject({ method: 'POST', url: '/api/templates/hop-dong-lao-dong/documents' })).json().data;
    const second = (await testApp.app.inject({ method: 'POST', url: '/api/templates/hop-dong-lao-dong/documents' })).json().data;

    assert.match(first.id, /^[0-9a-f-]{36}$/, 'API trả uuid, không trả id số');
    assert.equal(first.templateId, 'hop-dong-lao-dong', 'API trả slug của mẫu');

    const [firstRow] = await db.select().from(documents).where(eq(documents.uuid, first.id));
    const [secondRow] = await db.select().from(documents).where(eq(documents.uuid, second.id));
    const [template] = await db.select().from(templates).where(eq(templates.slug, 'hop-dong-lao-dong'));

    assert.equal(typeof firstRow.id, 'number');
    assert.ok(secondRow.id > firstRow.id, 'id tự tăng');
    assert.equal(firstRow.templateId, template.id);
  });

  test('seed chạy lại không đổi id của loại, danh mục, mẫu (upsert theo code / slug)', async () => {
    const { db, seed, docTypes, categories, templates } = await loadDb();

    async function readIds() {
      return {
        docTypes: await db.select({ id: docTypes.id, key: docTypes.code }).from(docTypes).orderBy(docTypes.id),
        categories: await db.select({ id: categories.id, key: categories.slug }).from(categories).orderBy(categories.id),
        templates: await db.select({ id: templates.id, key: templates.slug }).from(templates).orderBy(templates.id),
      };
    }

    const before = await readIds();
    await seed();
    assert.deepEqual(await readIds(), before);
  });
});
