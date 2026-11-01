import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { after, before, describe, test, type TestContext } from 'node:test';
import JSZip from 'jszip';
import { setupTestApp } from './setup.js';

let testApp: Awaited<ReturnType<typeof setupTestApp>>;
let manifest: Manifest;

type Manifest = {
  templates: { id: string; type: string; category: string; name: string }[];
};

type ApiRequest = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  url: string;
  payload?: string | Buffer | object;
  headers?: Record<string, string>;
};

before(async () => {
  testApp = await setupTestApp();
  manifest = JSON.parse(await readFile(path.join(testApp.storageRoot, 'templates/manifest.json'), 'utf8'));
});

after(async () => {
  await testApp.cleanup();
});

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const MISSING_UUID = '00000000-0000-4000-8000-000000000000';
const CONTRACT_TEMPLATE = 'templates/docx/hop-dong-lao-dong.docx';
const SAVE_LIMIT_BYTES = 20 * 1024 * 1024;

function shortenUrl(url: string) {
  const readableUrl = decodeURI(url);
  return readableUrl.length > 70 ? `${readableUrl.slice(0, 50)}…(${readableUrl.length} ký tự)` : readableUrl;
}

async function callApi(t: TestContext, request: ApiRequest) {
  const method = request.method ?? 'GET';
  const res = await testApp.app.inject({ ...request, method });
  t.diagnostic(`${method} ${shortenUrl(request.url)} → ${res.statusCode}`);
  return res;
}

function templatesUrl(filter: Record<string, string>) {
  const query = Object.entries(filter).map(([key, value]) => `${key}=${encodeURIComponent(value)}`);
  return `/api/templates?${query.join('&')}`;
}

async function listTemplates(t: TestContext, filter: Record<string, string>) {
  const res = await callApi(t, { url: templatesUrl(filter) });
  assert.equal(res.statusCode, 200);
  return res.json().data;
}

function templateIdsOfType(type: string) {
  return manifest.templates.filter((template) => template.type === type).map((template) => template.id);
}

function expectedCategoryTotals(type: string) {
  const totals: Record<string, number> = {};
  for (const template of manifest.templates) {
    if (template.type === type) {
      totals[template.category] = (totals[template.category] ?? 0) + 1;
    }
  }
  return totals;
}

function idsOf(items: { id: string }[]) {
  return items.map((item) => item.id).sort();
}

function storagePath(relativePath: string) {
  return path.join(testApp.storageRoot, relativePath);
}

function readStorageFile(relativePath: string) {
  return readFile(storagePath(relativePath));
}

async function getFileHash(relativePath: string) {
  return createHash('sha256').update(await readStorageFile(relativePath)).digest('hex');
}

async function createDocument(t: TestContext, templateId: string, body?: object) {
  const res = await callApi(t, { method: 'POST', url: `/api/templates/${templateId}/documents`, payload: body });
  assert.equal(res.statusCode, 201);
  return res.json().data;
}

function saveDocument(t: TestContext, documentId: string, content: Buffer | string, contentType = DOCX_MIME) {
  return callApi(t, {
    method: 'PUT',
    url: `/api/documents/${documentId}`,
    payload: content,
    headers: { 'content-type': contentType },
  });
}

function renameDocument(t: TestContext, documentId: string, body: object) {
  return callApi(t, { method: 'PATCH', url: `/api/documents/${documentId}`, payload: body });
}

async function makeEditedContract(newHeading: string) {
  const zip = await JSZip.loadAsync(await readStorageFile(CONTRACT_TEMPLATE));
  const xml = await zip.file('word/document.xml')!.async('string');
  zip.file('word/document.xml', xml.replace('HỢP ĐỒNG LAO ĐỘNG', newHeading));
  return zip.generateAsync({ type: 'nodebuffer' });
}

async function readDocumentXml(docxContent: Buffer) {
  const zip = await JSZip.loadAsync(docxContent);
  return zip.file('word/document.xml')!.async('string');
}

async function countSlides(pptxContent: Buffer) {
  const zip = await JSZip.loadAsync(pptxContent);
  return zip.file(/^ppt\/slides\/slide\d+\.xml$/).length;
}

function downloadName(fileName: string) {
  return `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

function assertErrorBody(res: { statusCode: number; json: () => any }, statusCode: number, message?: string) {
  assert.equal(res.statusCode, statusCode);
  const body = res.json();
  assert.equal(body.code, statusCode);
  assert.equal(body.data, null);
  if (message) {
    assert.equal(body.message, message);
  }
}

async function assertPngImage(t: TestContext, url: string) {
  const res = await callApi(t, { url });
  assert.equal(res.statusCode, 200, url);
  assert.equal(res.headers['content-type'], 'image/png', url);
}

describe('Bài 1 – Văn bản', () => {
  test('VB-001 Hiển thị danh sách mẫu văn bản có tên, mô tả, danh mục, thumbnail', async (t) => {
    const templates = await listTemplates(t, { type: 'docx' });

    assert.deepEqual(idsOf(templates), templateIdsOfType('docx').sort());
    assert.ok(templates.length >= 5, 'đề yêu cầu ít nhất 5 mẫu');
    for (const template of templates) {
      assert.equal(template.type, 'docx');
      assert.ok(template.name && template.description, template.id);
      assert.ok(template.category.id && template.category.name, template.id);
      assert.equal(template.thumbnailUrl, `/files/previews/${template.id}/1.png`);
      await assertPngImage(t, template.thumbnailUrl);
    }
    t.diagnostic(`${templates.length} mẫu văn bản, đủ tên / mô tả / danh mục, thumbnail tải được`);
  });

  test('VB-002 Tìm "hop dong" không dấu ra "Hợp đồng…"', async (t) => {
    const names = (await listTemplates(t, { type: 'docx', q: 'hop dong' })).map((template: { name: string }) => template.name);
    assert.ok(names.includes('Hợp đồng lao động'));
    t.diagnostic(`Kết quả: ${names.join(', ')}`);
  });

  test('VB-003 Tìm không phân biệt hoa thường, dấu; tìm cả trong mô tả', async (t) => {
    const upperCase = await listTemplates(t, { type: 'docx', q: 'HỢP ĐỒNG' });
    const noAccent = await listTemplates(t, { type: 'docx', q: 'hop dong' });
    assert.deepEqual(upperCase, noAccent);

    const byDescription = await listTemplates(t, { type: 'docx', q: 'tien luong' });
    assert.deepEqual(idsOf(byDescription), ['hop-dong-lao-dong']);
    t.diagnostic('"HỢP ĐỒNG" = "hop dong"; "tien luong" ra hop-dong-lao-dong');
  });

  test('VB-004 Tìm không thấy mẫu nào / từ khoá chỉ có khoảng trắng', async (t) => {
    assert.deepEqual(await listTemplates(t, { type: 'docx', q: 'xyz khong ton tai' }), []);

    const blank = await listTemplates(t, { type: 'docx', q: '   ' });
    assert.deepEqual(idsOf(blank), templateIdsOfType('docx').sort());
    t.diagnostic(`Không khớp: 0 mẫu; khoảng trắng: ${blank.length} mẫu`);
  });

  test('VB-005 Biên độ dài từ khoá: 100 ký tự hợp lệ, 101 ký tự bị từ chối', async (t) => {
    assert.deepEqual(await listTemplates(t, { type: 'docx', q: 'a'.repeat(100) }), []);
    assertErrorBody(await callApi(t, { url: templatesUrl({ type: 'docx', q: 'a'.repeat(101) }) }), 400);
  });

  test('VB-006 Từ khoá chứa ký tự đặc biệt %, _, \\', async (t) => {
    for (const keyword of ['%', '_', '\\']) {
      assert.deepEqual(await listTemplates(t, { type: 'docx', q: keyword }), [], keyword);
    }
  });

  test('VB-007 Danh mục lọc của thư viện văn bản kèm số lượng mẫu', async (t) => {
    const res = await callApi(t, { url: '/api/categories?type=docx' });
    const totals = Object.fromEntries(res.json().data.map((category: { id: string; total: number }) => [category.id, category.total]));

    assert.equal(res.statusCode, 200);
    assert.deepEqual(totals, expectedCategoryTotals('docx'));
    assert.ok(!('kinh-doanh' in totals));
    t.diagnostic(JSON.stringify(totals));
  });

  test('VB-008 Lọc theo danh mục, kết hợp danh mục + từ khoá', async (t) => {
    const education = await listTemplates(t, { type: 'docx', category: 'giao-duc' });
    const expected = manifest.templates
      .filter((template) => template.type === 'docx' && template.category === 'giao-duc')
      .map((template) => template.id);
    assert.deepEqual(idsOf(education), expected.sort());

    const semester = await listTemplates(t, { type: 'docx', category: 'giao-duc', q: 'hoc ky' });
    assert.deepEqual(idsOf(semester), ['thoi-khoa-bieu-hoc-ky']);
    t.diagnostic(`Giáo dục: ${idsOf(education).join(', ')}; + "hoc ky": thoi-khoa-bieu-hoc-ky`);
  });

  test('VB-009 Lọc theo danh mục không có mẫu văn bản / danh mục sai định dạng', async (t) => {
    assert.deepEqual(await listTemplates(t, { type: 'docx', category: 'kinh-doanh' }), []);
    assertErrorBody(await callApi(t, { url: templatesUrl({ type: 'docx', category: '../etc' }) }), 400);
  });

  test('VB-010 Xem trước mẫu văn bản', async (t) => {
    const res = await callApi(t, { url: '/api/templates/hop-dong-lao-dong' });
    const template = res.json().data;

    assert.equal(res.statusCode, 200);
    assert.equal(template.name, 'Hợp đồng lao động');
    assert.ok(template.description && template.category.name);
    assert.ok(template.previews.length >= 1);
    template.previews.forEach((preview: { position: number }, index: number) => {
      assert.equal(preview.position, index + 1);
    });

    const file = await callApi(t, { url: template.fileUrl });
    assert.equal(file.statusCode, 200);
    assert.equal(file.headers['content-type'], DOCX_MIME);
    assert.ok(file.rawPayload.equals(await readStorageFile(CONTRACT_TEMPLATE)));
    t.diagnostic(`${template.previews.length} ảnh xem trước; file DOCX giống file mẫu`);
  });

  test('VB-011 Xem trước mẫu không tồn tại', async (t) => {
    assertErrorBody(await callApi(t, { url: '/api/templates/khong-ton-tai' }), 404, 'Không tìm thấy mẫu');
  });

  test('VB-012 Dùng mẫu tạo tài liệu mới, file mẫu gốc không đổi', async (t) => {
    const hashBefore = await getFileHash(CONTRACT_TEMPLATE);

    const res = await callApi(t, {
      method: 'POST',
      url: '/api/templates/hop-dong-lao-dong/documents',
      payload: { title: 'Hợp đồng của tôi' },
    });
    const document = res.json().data;

    assert.equal(res.statusCode, 201);
    assert.equal(res.json().message, 'Đã tạo tài liệu');
    assert.equal(document.title, 'Hợp đồng của tôi');
    assert.equal(document.type, 'docx');
    assert.equal(document.editable, true);
    assert.equal(await getFileHash(`documents/demo/${document.id}.docx`), hashBefore);
    assert.equal(await getFileHash(CONTRACT_TEMPLATE), hashBefore);
    t.diagnostic(`SHA-256 mẫu gốc trước = sau = bản sao (${hashBefore.slice(0, 12)}…)`);
  });

  test('VB-013 Tạo tài liệu không nhập tiêu đề / tiêu đề có khoảng trắng hai đầu', async (t) => {
    const untitled = await createDocument(t, 'hop-dong-lao-dong');
    assert.equal(untitled.title, 'Hợp đồng lao động');

    const trimmed = await createDocument(t, 'hop-dong-lao-dong', { title: '  Báo cáo quý 4  ' });
    assert.equal(trimmed.title, 'Báo cáo quý 4');
    t.diagnostic(`"${untitled.title}"; "${trimmed.title}"`);
  });

  test('VB-014 Biên độ dài tiêu đề khi tạo tài liệu', async (t) => {
    assert.equal((await createDocument(t, 'hop-dong-lao-dong', { title: 'A' })).title, 'A');

    const maxTitle = 'Đ'.repeat(200);
    assert.equal((await createDocument(t, 'hop-dong-lao-dong', { title: maxTitle })).title, maxTitle);

    for (const title of ['a'.repeat(201), '', '   ']) {
      const res = await callApi(t, { method: 'POST', url: '/api/templates/hop-dong-lao-dong/documents', payload: { title } });
      assertErrorBody(res, 400);
    }
  });

  test('VB-015 Tạo tài liệu từ mẫu không tồn tại', async (t) => {
    const countBefore = (await callApi(t, { url: '/api/documents' })).json().data.length;
    const res = await callApi(t, { method: 'POST', url: '/api/templates/khong-ton-tai/documents' });
    assertErrorBody(res, 404, 'Không tìm thấy mẫu');

    const countAfter = (await callApi(t, { url: '/api/documents' })).json().data.length;
    assert.equal(countAfter, countBefore);
    t.diagnostic(`Số tài liệu trước = sau = ${countAfter}`);
  });

  test('VB-016 Sửa và lưu tài liệu giữ heading, đậm, danh sách, bảng', async (t) => {
    const hashBefore = await getFileHash(CONTRACT_TEMPLATE);
    const document = await createDocument(t, 'hop-dong-lao-dong');
    const editedFile = await makeEditedContract('HỢP ĐỒNG ĐÃ CHỈNH SỬA');

    await new Promise((resolve) => setTimeout(resolve, 1100));
    const res = await saveDocument(t, document.id, editedFile);
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().message, 'Đã lưu tài liệu');
    assert.ok(res.json().data.updatedAt > document.updatedAt, 'thời gian sửa phải tăng');

    const listed = (await callApi(t, { url: '/api/documents' })).json().data;
    assert.equal(listed[0].id, document.id, 'tài liệu vừa lưu phải lên đầu danh sách');

    const download = await callApi(t, { url: document.downloadUrl });
    assert.ok(download.rawPayload.equals(editedFile), 'tải về phải đúng file vừa lưu');

    const xml = await readDocumentXml(download.rawPayload);
    assert.match(xml, /HỢP ĐỒNG ĐÃ CHỈNH SỬA/);
    assert.match(xml, /<w:pStyle w:val="Heading1"\/>/, 'mất heading');
    assert.match(xml, /<w:b\/>/, 'mất chữ đậm');
    assert.match(xml, /ListBullet|ListNumber|<w:numPr>/, 'mất danh sách');
    assert.match(xml, /<w:tbl>/, 'mất bảng');

    assert.equal(await getFileHash(CONTRACT_TEMPLATE), hashBefore);
    t.diagnostic('Còn Heading1, chữ đậm, danh sách, bảng; mẫu gốc không đổi');
  });

  test('VB-017 Lưu nhiều lần liên tiếp (tự lưu)', async (t) => {
    const document = await createDocument(t, 'hop-dong-lao-dong');

    assert.equal((await saveDocument(t, document.id, await makeEditedContract('BẢN 1'))).statusCode, 200);
    assert.equal((await saveDocument(t, document.id, await makeEditedContract('BẢN 2'))).statusCode, 200);

    const xml = await readDocumentXml((await callApi(t, { url: document.downloadUrl })).rawPayload);
    assert.match(xml, /BẢN 2/);
    assert.doesNotMatch(xml, /BẢN 1/);
    t.diagnostic('File tải về là bản lưu sau cùng');
  });

  test('VB-018 Lưu nội dung không phải .docx bị từ chối', async (t) => {
    const document = await createDocument(t, 'hop-dong-lao-dong');
    const NOT_DOCX = 'File gửi lên không phải định dạng .docx';

    assertErrorBody(await saveDocument(t, document.id, Buffer.from('day khong phai file docx')), 400, NOT_DOCX);
    assertErrorBody(await saveDocument(t, document.id, await readStorageFile('templates/pptx/bai-giang.pptx')), 400, NOT_DOCX);
    assertErrorBody(await saveDocument(t, document.id, JSON.stringify({ contentHtml: '<p>x</p>' }), 'application/json'), 415);

    const download = await callApi(t, { url: document.downloadUrl });
    assert.ok(download.rawPayload.equals(await readStorageFile(CONTRACT_TEMPLATE)), 'tài liệu bị ghi đè');
    t.diagnostic('Tài liệu không bị ghi đè sau 3 lần gửi sai');
  });

  test('VB-019 Biên kích thước file lưu: đúng 20 MB và 20 MB + 1 byte', async (t) => {
    const document = await createDocument(t, 'hop-dong-lao-dong');

    assertErrorBody(await saveDocument(t, document.id, Buffer.alloc(SAVE_LIMIT_BYTES)), 400, 'File gửi lên không phải định dạng .docx');
    assertErrorBody(await saveDocument(t, document.id, Buffer.alloc(SAVE_LIMIT_BYTES + 1)), 413);
    t.diagnostic(`${SAVE_LIMIT_BYTES} byte → 400 (qua giới hạn, sai định dạng); ${SAVE_LIMIT_BYTES + 1} byte → 413`);
  });

  test('VB-020 Đổi tên tài liệu, tải xuống theo tên mới', async (t) => {
    const document = await createDocument(t, 'hop-dong-lao-dong');
    const hashBefore = await getFileHash(`documents/demo/${document.id}.docx`);

    const res = await renameDocument(t, document.id, { title: '  HĐLĐ Nguyễn Văn A  ' });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().data.title, 'HĐLĐ Nguyễn Văn A');
    assert.equal((await callApi(t, { url: `/api/documents/${document.id}` })).json().data.title, 'HĐLĐ Nguyễn Văn A');
    assert.equal(await getFileHash(`documents/demo/${document.id}.docx`), hashBefore);

    const download = await callApi(t, { url: document.downloadUrl });
    assert.equal(download.headers['content-disposition'], downloadName('HĐLĐ Nguyễn Văn A.docx'));
    t.diagnostic('Tên mới "HĐLĐ Nguyễn Văn A", file không đổi, tải về "HĐLĐ Nguyễn Văn A.docx"');
  });

  test('VB-021 Biên tên khi đổi tên tài liệu', async (t) => {
    const document = await createDocument(t, 'hop-dong-lao-dong');

    for (const title of ['X', 'a'.repeat(200)]) {
      const res = await renameDocument(t, document.id, { title });
      assert.equal(res.statusCode, 200, `${title.length} ký tự`);
      assert.equal(res.json().data.title, title);
    }
    for (const body of [{ title: 'a'.repeat(201) }, { title: '' }, { title: '   ' }, {}]) {
      assertErrorBody(await renameDocument(t, document.id, body), 400);
    }
  });

  test('VB-022 Tải xuống tài liệu .docx', async (t) => {
    const document = await createDocument(t, 'thoi-khoa-bieu-tuan');
    const res = await callApi(t, { url: document.downloadUrl });
    const template = await readStorageFile('templates/docx/thoi-khoa-bieu-tuan.docx');

    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['content-type'], DOCX_MIME);
    assert.equal(res.headers['content-disposition'], downloadName(`${document.title}.docx`));
    assert.equal(Number(res.headers['content-length']), template.length);
    assert.ok(res.rawPayload.equals(template));
    t.diagnostic(`"${document.title}.docx", ${template.length} byte, giống mẫu gốc`);
  });

  test('VB-023 Danh sách tài liệu đã tạo hiển thị tài liệu văn bản', async (t) => {
    const document = await createDocument(t, 'cv-thiet-ke-noi-that');
    const list = (await callApi(t, { url: '/api/documents' })).json().data;
    const item = list.find((entry: { id: string }) => entry.id === document.id);

    assert.ok(item, 'tài liệu vừa tạo phải có trong danh sách');
    assert.equal(item.type, 'docx');
    assert.equal(item.editable, true);
    assert.equal(item.thumbnailUrl, '/files/previews/cv-thiet-ke-noi-that/1.png');
    assert.equal(item.downloadUrl, `/api/documents/${document.id}/download`);
    for (let i = 1; i < list.length; i++) {
      assert.ok(list[i - 1].updatedAt >= list[i].updatedAt, 'phải sắp xếp mới sửa lên đầu');
    }
    t.diagnostic(`${list.length} tài liệu trong danh sách, có tài liệu vừa tạo`);
  });

  test('VB-024 Mở / tải tài liệu không tồn tại hoặc đã mất file', async (t) => {
    assertErrorBody(await callApi(t, { url: `/api/documents/${MISSING_UUID}` }), 404, 'Không tìm thấy tài liệu');
    assertErrorBody(await callApi(t, { url: `/api/documents/${MISSING_UUID}/download` }), 404, 'Không tìm thấy tài liệu');

    const document = await createDocument(t, 'hop-dong-lao-dong');
    await rm(storagePath(`documents/demo/${document.id}.docx`));
    const res = await callApi(t, { url: document.downloadUrl });
    assertErrorBody(res, 404, 'Không tìm thấy file');
    assert.ok(!res.body.includes(testApp.storageRoot), 'không được lộ đường dẫn trên server');
  });
});

describe('Bài 2 – Trình chiếu', () => {
  test('TC-001 Hiển thị danh sách bộ mẫu trình chiếu có thumbnail', async (t) => {
    const templates = await listTemplates(t, { type: 'pptx' });

    assert.deepEqual(idsOf(templates), templateIdsOfType('pptx').sort());
    assert.ok(templates.length >= 3, 'đề yêu cầu ít nhất 3 bộ mẫu');
    for (const template of templates) {
      assert.equal(template.type, 'pptx');
      assert.ok(template.name && template.description && template.category.name, template.id);
      assert.equal(template.thumbnailUrl, `/files/previews/${template.id}/1.png`);
      await assertPngImage(t, template.thumbnailUrl);
    }
    t.diagnostic(`${templates.length} bộ trình chiếu, thumbnail = slide 1, tải được`);
  });

  test('TC-002 Tìm bộ mẫu trình chiếu không dấu', async (t) => {
    assert.deepEqual(idsOf(await listTemplates(t, { type: 'pptx', q: 'du an' })), ['gioi-thieu-du-an']);
    assert.deepEqual(idsOf(await listTemplates(t, { type: 'pptx', q: 'BÀI GIẢNG' })), ['bai-giang']);
  });

  test('TC-003 Tìm trong thư viện trình chiếu không lẫn mẫu văn bản', async (t) => {
    assert.deepEqual(await listTemplates(t, { type: 'pptx', q: 'hop dong' }), []);
    assert.deepEqual(await listTemplates(t, { type: 'pptx', q: 'xyz' }), []);
  });

  test('TC-004 Từ khoá có khoảng trắng hai đầu', async (t) => {
    const padded = await listTemplates(t, { type: 'pptx', q: '   bai giang   ' });
    assert.deepEqual(idsOf(padded), ['bai-giang']);
  });

  test('TC-005 Phân loại bộ mẫu trình chiếu theo danh mục kèm số lượng', async (t) => {
    const res = await callApi(t, { url: '/api/categories?type=pptx' });
    const totals = Object.fromEntries(res.json().data.map((category: { id: string; total: number }) => [category.id, category.total]));

    assert.equal(res.statusCode, 200);
    assert.deepEqual(totals, expectedCategoryTotals('pptx'));
    assert.ok(!('hanh-chinh' in totals));
    t.diagnostic(JSON.stringify(totals));
  });

  test('TC-006 Lọc bộ mẫu theo danh mục, kết hợp danh mục + từ khoá', async (t) => {
    assert.deepEqual(idsOf(await listTemplates(t, { type: 'pptx', category: 'kinh-doanh' })), ['gioi-thieu-du-an', 'ke-hoach-marketing']);
    assert.deepEqual(idsOf(await listTemplates(t, { type: 'pptx', category: 'bao-cao', q: 'quy' })), ['bao-cao-kinh-doanh-quy']);
  });

  test('TC-007 Lọc danh mục chỉ có mẫu văn bản trong thư viện trình chiếu', async (t) => {
    assert.deepEqual(await listTemplates(t, { type: 'pptx', category: 'hanh-chinh' }), []);
  });

  test('TC-008 Xem trước toàn bộ slide của một bộ mẫu', async (t) => {
    const res = await callApi(t, { url: '/api/templates/bao-cao-kinh-doanh-quy' });
    const template = res.json().data;
    const slideCount = await countSlides(await readStorageFile('templates/pptx/bao-cao-kinh-doanh-quy.pptx'));

    assert.equal(res.statusCode, 200);
    assert.equal(template.previews.length, slideCount);
    assert.equal(template.thumbnailUrl, template.previews[0].url);
    for (const [index, preview] of template.previews.entries()) {
      assert.equal(preview.position, index + 1);
      await assertPngImage(t, preview.url);
    }
    t.diagnostic(`${template.previews.length} slide xem trước = ${slideCount} slide trong file, ảnh nào cũng tải được`);
  });

  test('TC-009 Biên ảnh slide: slide cuối, sau slide cuối, slide 0', async (t) => {
    const template = (await callApi(t, { url: '/api/templates/bao-cao-kinh-doanh-quy' })).json().data;
    const lastSlide = template.previews.length;

    await assertPngImage(t, `/files/previews/bao-cao-kinh-doanh-quy/${lastSlide}.png`);
    assertErrorBody(await callApi(t, { url: `/files/previews/bao-cao-kinh-doanh-quy/${lastSlide + 1}.png` }), 404);
    assertErrorBody(await callApi(t, { url: '/files/previews/bao-cao-kinh-doanh-quy/0.png' }), 404);
  });

  test('TC-010 Mọi bộ mẫu đều có danh sách slide xem trước khớp file', async (t) => {
    for (const templateId of templateIdsOfType('pptx')) {
      const template = (await callApi(t, { url: `/api/templates/${templateId}` })).json().data;
      const slideCount = await countSlides(await readStorageFile(`templates/pptx/${templateId}.pptx`));

      assert.ok(template.name && template.description, templateId);
      assert.ok(template.previews.length >= 1, templateId);
      assert.equal(template.previews.length, slideCount, templateId);
      t.diagnostic(`${templateId}: ${slideCount} slide`);
    }
  });

  test('TC-011 Xem trước bộ mẫu không tồn tại', async (t) => {
    assertErrorBody(await callApi(t, { url: '/api/templates/khong-ton-tai' }), 404, 'Không tìm thấy mẫu');
  });

  test('TC-012 Tạo bản trình chiếu mới từ mẫu, mẫu gốc không đổi', async (t) => {
    const templateFile = 'templates/pptx/bai-giang.pptx';
    const hashBefore = await getFileHash(templateFile);
    const presentation = await createDocument(t, 'bai-giang');

    assert.equal(presentation.type, 'pptx');
    assert.equal(presentation.title, 'Bài giảng lớp học');
    assert.equal(presentation.editable, false);
    assert.equal(await getFileHash(`documents/demo/${presentation.id}.pptx`), hashBefore);
    assert.equal(await getFileHash(templateFile), hashBefore);
    t.diagnostic(`SHA-256 mẫu gốc trước = sau = bản sao (${hashBefore.slice(0, 12)}…)`);
  });

  test('TC-013 Bản trình chiếu độc lập với mẫu gốc và bản sao khác', async (t) => {
    const templateFile = 'templates/pptx/gioi-thieu-du-an.pptx';
    const templateContent = await readStorageFile(templateFile);
    const first = await createDocument(t, 'gioi-thieu-du-an');
    const second = await createDocument(t, 'gioi-thieu-du-an');
    assert.notEqual(first.id, second.id);

    await writeFile(storagePath(`documents/demo/${first.id}.pptx`), 'noi dung da sua bang ung dung ngoai');

    assert.ok((await readStorageFile(templateFile)).equals(templateContent), 'mẫu gốc bị ảnh hưởng');
    const secondFile = await callApi(t, { url: second.downloadUrl });
    assert.ok(secondFile.rawPayload.equals(templateContent), 'bản 2 bị ảnh hưởng');
    t.diagnostic('Sửa bản 1: mẫu gốc và bản 2 không đổi');
  });

  test('TC-014 Tạo bản trình chiếu với tiêu đề tuỳ chọn, biên độ dài', async (t) => {
    for (const title of ['Bài giảng tuần 1', 'a'.repeat(200)]) {
      assert.equal((await createDocument(t, 'bai-giang', { title })).title, title);
    }
    const tooLong = await callApi(t, { method: 'POST', url: '/api/templates/bai-giang/documents', payload: { title: 'a'.repeat(201) } });
    assertErrorBody(tooLong, 400);
  });

  test('TC-015 Tạo bản trình chiếu từ bộ mẫu không tồn tại', async (t) => {
    const res = await callApi(t, { method: 'POST', url: '/api/templates/khong-ton-tai/documents' });
    assertErrorBody(res, 404, 'Không tìm thấy mẫu');
  });

  test('TC-016 Tải xuống PPTX mở được bằng ứng dụng tương thích', async (t) => {
    const presentation = await createDocument(t, 'bao-cao-kinh-doanh-quy');
    const template = (await callApi(t, { url: '/api/templates/bao-cao-kinh-doanh-quy' })).json().data;
    const res = await callApi(t, { url: presentation.downloadUrl });

    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['content-type'], PPTX_MIME);
    assert.equal(res.headers['content-disposition'], downloadName(`${presentation.title}.pptx`));
    assert.equal(Number(res.headers['content-length']), res.rawPayload.length);

    const zip = await JSZip.loadAsync(res.rawPayload);
    assert.ok(zip.file('ppt/presentation.xml'), 'không phải file PPTX hợp lệ');
    assert.equal(await countSlides(res.rawPayload), template.previews.length);
    assert.ok(res.rawPayload.equals(await readStorageFile('templates/pptx/bao-cao-kinh-doanh-quy.pptx')));
    t.diagnostic(`"${presentation.title}.pptx" hợp lệ, ${template.previews.length} slide, giống mẫu gốc`);
  });

  test('TC-017 Chưa hỗ trợ sửa slide trong ứng dụng', async (t) => {
    const presentation = await createDocument(t, 'bai-giang');
    const res = await saveDocument(t, presentation.id, await makeEditedContract('X'));
    assertErrorBody(res, 409, 'Loại tài liệu này chưa hỗ trợ chỉnh sửa');

    const download = await callApi(t, { url: presentation.downloadUrl });
    assert.ok(download.rawPayload.equals(await readStorageFile('templates/pptx/bai-giang.pptx')));
    t.diagnostic('Bản trình chiếu vẫn giống mẫu gốc');
  });

  test('TC-018 Đổi tên bản trình chiếu, tải xuống theo tên mới', async (t) => {
    const presentation = await createDocument(t, 'gioi-thieu-du-an');
    const res = await renameDocument(t, presentation.id, { title: 'Thuyết trình khách hàng ABC' });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().data.title, 'Thuyết trình khách hàng ABC');

    const download = await callApi(t, { url: presentation.downloadUrl });
    assert.equal(download.headers['content-disposition'], downloadName('Thuyết trình khách hàng ABC.pptx'));
    assert.ok(download.rawPayload.equals(await readStorageFile('templates/pptx/gioi-thieu-du-an.pptx')));
    t.diagnostic('Tải về "Thuyết trình khách hàng ABC.pptx", nội dung không đổi');
  });

  test('TC-019 Danh sách tài liệu hiển thị bản trình chiếu', async (t) => {
    const presentation = await createDocument(t, 'bai-giang');
    const list = (await callApi(t, { url: '/api/documents' })).json().data;
    const item = list.find((entry: { id: string }) => entry.id === presentation.id);

    assert.ok(item, 'bản trình chiếu vừa tạo phải có trong danh sách');
    assert.equal(item.type, 'pptx');
    assert.equal(item.editable, false);
    assert.equal(item.thumbnailUrl, '/files/previews/bai-giang/1.png');
    assert.equal(item.downloadUrl, `/api/documents/${presentation.id}/download`);
  });

  test('TC-020 Tải bản trình chiếu không tồn tại', async (t) => {
    assertErrorBody(await callApi(t, { url: `/api/documents/${MISSING_UUID}/download` }), 404, 'Không tìm thấy tài liệu');
  });
});
