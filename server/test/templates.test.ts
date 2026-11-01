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

function callApi(url: string) {
  return testApp.app.inject({ method: 'GET', url });
}

describe('GET /api/templates', () => {
  test('trả danh sách mẫu theo loại, có danh mục và thumbnail', async () => {
    const res = await callApi('/api/templates?type=docx');
    const body = res.json();

    assert.equal(res.statusCode, 200);
    assert.equal(body.code, 200);
    assert.ok(body.data.length >= 5);

    for (const template of body.data) {
      assert.equal(template.type, 'docx');
      assert.ok(template.category.id);
      assert.ok(template.category.name);
      assert.match(template.thumbnailUrl, /^\/files\/previews\/.+\/1\.png$/);
    }

    const pptx = await callApi('/api/templates?type=pptx');
    assert.ok(pptx.json().data.length >= 3);
  });

  test('tìm "hop dong" ra "Hợp đồng…" (không phân biệt hoa thường và dấu)', async () => {
    const res = await callApi('/api/templates?q=' + encodeURIComponent('hop dong'));
    const names = res.json().data.map((template: { name: string }) => template.name);
    assert.ok(names.some((name: string) => name.startsWith('Hợp đồng')));

    const resUpperCase = await callApi('/api/templates?q=' + encodeURIComponent('HỢP ĐỒNG'));
    assert.deepEqual(resUpperCase.json().data, res.json().data);
  });

  test('ký tự % và _ trong từ khoá được tìm đúng nghĩa đen', async () => {
    assert.deepEqual((await callApi('/api/templates?q=%25')).json().data, []);
    assert.deepEqual((await callApi('/api/templates?q=_')).json().data, []);
  });

  test('lọc theo danh mục', async () => {
    const res = await callApi('/api/templates?type=docx&category=giao-duc');
    const templates = res.json().data;

    assert.ok(templates.length > 0);
    for (const template of templates) {
      assert.equal(template.category.id, 'giao-duc');
    }
  });

  test('tham số sai định dạng thì trả 400', async () => {
    const res = await callApi('/api/templates?category=..%2Fetc');
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().code, 400);
    assert.equal(res.json().data, null);
  });
});

describe('GET /api/categories', () => {
  test('tổng số mẫu của các danh mục bằng số mẫu của loại đó', async () => {
    const categories = (await callApi('/api/categories?type=pptx')).json().data;
    const templates = (await callApi('/api/templates?type=pptx')).json().data;

    let total = 0;
    for (const category of categories) {
      assert.ok(category.total > 0);
      total += category.total;
    }
    assert.equal(total, templates.length);
  });
});

describe('GET /api/templates/:id', () => {
  test('trả chi tiết mẫu và danh sách ảnh preview theo thứ tự', async () => {
    const res = await callApi('/api/templates/bao-cao-kinh-doanh-quy');
    const template = res.json().data;

    assert.equal(res.statusCode, 200);
    assert.equal(template.fileUrl, '/api/templates/bao-cao-kinh-doanh-quy/file');
    assert.ok(template.previews.length > 1);
    template.previews.forEach((preview: { position: number }, index: number) => {
      assert.equal(preview.position, index + 1);
    });
    assert.equal(template.thumbnailUrl, template.previews[0].url);
  });

  test('mẫu không tồn tại thì trả 404', async () => {
    const res = await callApi('/api/templates/khong-ton-tai');
    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.json(), { code: 404, message: 'Không tìm thấy mẫu', data: null });
  });
});

describe('Dạng response chung', () => {
  test('mọi response JSON đều có { code, message, data } và code = HTTP status', async () => {
    const urls = [
      '/api/health',
      '/api/templates',
      '/api/categories',
      '/api/templates/bai-giang',
      '/api/templates/khong-co',
      '/api/templates?type=X',
      '/api/khong-co',
    ];

    for (const url of urls) {
      const res = await callApi(url);
      const body = res.json();

      assert.deepEqual(Object.keys(body).sort(), ['code', 'data', 'message'], url);
      assert.equal(body.code, res.statusCode, url);
      assert.equal(typeof body.message, 'string', url);
      if (res.statusCode >= 400) {
        assert.equal(body.data, null, url);
      }
    }
  });
});

describe('File mẫu và ảnh preview', () => {
  test('trả file mẫu đúng MIME type', async () => {
    const res = await callApi('/api/templates/hop-dong-lao-dong/file');
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['content-type'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    assert.equal(res.rawPayload.subarray(0, 2).toString(), 'PK');
  });

  test('trả ảnh preview', async () => {
    const res = await callApi('/files/previews/hop-dong-lao-dong/1.png');
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['content-type'], 'image/png');
  });

  test('chặn path traversal ra ngoài thư mục previews/', async () => {
    const badUrls = [
      '/files/previews/..%2Ftemplates%2Fmanifest.json',
      '/files/previews/%2E%2E/%2E%2E/package.json',
      '/files/previews/..%5C..%5Cpackage.json',
      '/files/previews/%2Fetc%2Fpasswd',
      '/files/previews/a%00.png',
    ];

    for (const url of badUrls) {
      const res = await callApi(url);
      assert.equal(res.statusCode, 404, url);
      assert.equal(res.json().code, 404, url);
    }
  });
});
