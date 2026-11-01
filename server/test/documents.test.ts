import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import JSZip from 'jszip';
import { setupTestApp } from './setup.js';

let testApp: Awaited<ReturnType<typeof setupTestApp>>;

before(async () => {
  testApp = await setupTestApp();
});

after(async () => {
  await testApp.cleanup();
});

const CONTRACT_TEMPLATE = 'templates/docx/hop-dong-lao-dong.docx';

// Mã SHA-256 của một file trong storage tạm, dùng để kiểm tra file có bị sửa không
async function getFileHash(relativePath: string) {
  const content = await readFile(path.join(testApp.storageRoot, relativePath));
  return createHash('sha256').update(content).digest('hex');
}

function createDocument(templateId: string, body?: object) {
  return testApp.app.inject({ method: 'POST', url: `/api/templates/${templateId}/documents`, payload: body });
}

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// Gửi file lên như editor ở trình duyệt: body là nội dung file, Content-Type DOCX
function saveDocument(documentId: string, content: Buffer | string, contentType = DOCX_MIME) {
  return testApp.app.inject({
    method: 'PUT',
    url: `/api/documents/${documentId}`,
    payload: content,
    headers: { 'content-type': contentType },
  });
}

function getUrl(url: string) {
  return testApp.app.inject({ method: 'GET', url });
}

// Tạo tài liệu và trả về phần data
async function createDocumentData(templateId: string) {
  const res = await createDocument(templateId);
  return res.json().data;
}

// Đọc nội dung word/document.xml bên trong file .docx
async function readDocumentXml(docxContent: Buffer) {
  const zip = await JSZip.loadAsync(docxContent);
  return zip.file('word/document.xml')!.async('string');
}

// Giả lập một lần sửa trong editor: lấy file mẫu hợp đồng, đổi dòng tiêu đề
async function makeEditedContract(newHeading: string) {
  const zip = await JSZip.loadAsync(await readFile(path.join(testApp.storageRoot, CONTRACT_TEMPLATE)));
  const xml = await zip.file('word/document.xml')!.async('string');
  zip.file('word/document.xml', xml.replace('HỢP ĐỒNG LAO ĐỘNG', newHeading));
  return zip.generateAsync({ type: 'nodebuffer' });
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('POST /api/templates/:id/documents', () => {
  test('copy mẫu vào documents/demo/, file mẫu gốc không bị thay đổi', async () => {
    const hashBefore = await getFileHash(CONTRACT_TEMPLATE);

    const res = await createDocument('hop-dong-lao-dong', { title: 'Hợp đồng của tôi' });
    const body = res.json();
    const document = body.data;

    assert.equal(res.statusCode, 201);
    assert.equal(body.code, 201);
    assert.equal(body.message, 'Đã tạo tài liệu');
    assert.equal(res.headers.location, `/api/documents/${document.id}`);
    assert.equal(document.title, 'Hợp đồng của tôi');
    assert.equal(document.type, 'docx');
    assert.equal(document.templateName, 'Hợp đồng lao động');
    assert.equal(document.editable, true);
    assert.equal(document.updatedAt, document.createdAt);

    // Bản sao giống hệt mẫu, mẫu gốc không đổi
    assert.equal(await getFileHash(`documents/demo/${document.id}.docx`), hashBefore);
    assert.equal(await getFileHash(CONTRACT_TEMPLATE), hashBefore);
  });

  test('không gửi body thì tiêu đề lấy theo tên mẫu', async () => {
    const res = await createDocument('bai-giang');
    assert.equal(res.statusCode, 201);
    assert.equal(res.json().data.title, 'Bài giảng lớp học');
    assert.equal(res.json().data.editable, false);
  });

  test('mẫu không tồn tại trả 404, tiêu đề toàn khoảng trắng trả 400', async () => {
    assert.equal((await createDocument('khong-ton-tai', {})).statusCode, 404);
    assert.equal((await createDocument('bai-giang', { title: '   ' })).statusCode, 400);
  });
});

describe('GET /api/documents', () => {
  test('trả tài liệu user đã tạo (docx và pptx), sửa gần nhất lên đầu, kèm thumbnail của mẫu', async () => {
    const contract = await createDocumentData('hop-dong-lao-dong');
    const lecture = await createDocumentData('bai-giang');

    const res = await getUrl('/api/documents');
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().code, 200);

    const list = res.json().data;
    const ids = list.map((item: { id: string }) => item.id);
    assert.ok(ids.includes(contract.id));
    assert.ok(ids.includes(lecture.id));

    const lectureItem = list.find((item: { id: string }) => item.id === lecture.id);
    assert.equal(lectureItem.type, 'pptx');
    assert.equal(lectureItem.templateName, 'Bài giảng lớp học');
    assert.equal(lectureItem.editable, false);
    assert.equal(lectureItem.downloadUrl, `/api/documents/${lecture.id}/download`);
    assert.equal(lectureItem.thumbnailUrl, '/files/previews/bai-giang/1.png');

    for (let i = 1; i < list.length; i++) {
      assert.ok(list[i - 1].updatedAt >= list[i].updatedAt, 'phải sắp xếp theo updatedAt giảm dần');
    }
  });
});

describe('GET /api/documents/:id', () => {
  test('trả thông tin tài liệu; không có thì 404; id sai định dạng thì 400', async () => {
    const document = await createDocumentData('hop-dong-lao-dong');

    const res = await getUrl(`/api/documents/${document.id}`);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json().data, document);

    const notFound = await getUrl('/api/documents/00000000-0000-4000-8000-000000000000');
    assert.deepEqual(notFound.json(), { code: 404, message: 'Không tìm thấy tài liệu', data: null });

    const badId = await getUrl('/api/documents/..%2F..%2Fpackage.json');
    assert.equal(badId.statusCode, 400);
  });
});

describe('PUT /api/documents/:id', () => {
  test('lưu file .docx từ editor: file đổi theo, còn heading / đậm / danh sách / bảng, updated_at tăng, mẫu gốc không đổi', async () => {
    const hashBefore = await getFileHash(CONTRACT_TEMPLATE);
    const document = await createDocumentData('hop-dong-lao-dong');
    const editedFile = await makeEditedContract('HỢP ĐỒNG ĐÃ CHỈNH SỬA');

    await wait(1100); // updated_at lưu tới giây, chờ để thấy thời gian thay đổi
    const res = await saveDocument(document.id, editedFile);
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().code, 200);
    assert.equal(res.json().message, 'Đã lưu tài liệu');
    assert.ok(res.json().data.updatedAt > document.updatedAt, 'updated_at phải tăng sau khi lưu');

    const listed = (await getUrl('/api/documents')).json().data;
    assert.equal(listed[0].id, document.id, 'tài liệu vừa lưu phải lên đầu danh sách');

    const download = await getUrl(document.downloadUrl);
    assert.equal(download.statusCode, 200);
    assert.ok(download.rawPayload.equals(editedFile), 'tải về phải đúng file vừa lưu');

    const xml = await readDocumentXml(download.rawPayload);
    assert.match(xml, /HỢP ĐỒNG ĐÃ CHỈNH SỬA/);
    assert.match(xml, /<w:pStyle w:val="Heading1"\/>/, 'mất heading');
    assert.match(xml, /<w:b\/>/, 'mất chữ đậm');
    assert.match(xml, /ListBullet|ListNumber|<w:numPr>/, 'mất danh sách');
    assert.match(xml, /<w:tbl>/, 'mất bảng');

    assert.equal(await getFileHash(CONTRACT_TEMPLATE), hashBefore);
  });

  test('file không phải .docx trả 400, gửi JSON trả 415, pptx trả 409, quá lớn trả 413, không có tài liệu trả 404', async () => {
    const document = await createDocumentData('hop-dong-lao-dong');

    const notDocx = await saveDocument(document.id, Buffer.from('day khong phai file docx'));
    assert.deepEqual(notDocx.json(), { code: 400, message: 'File gửi lên không phải định dạng .docx', data: null });

    const json = await saveDocument(document.id, JSON.stringify({ contentHtml: '<p>x</p>' }), 'application/json');
    assert.equal(json.statusCode, 415);
    assert.equal(json.json().code, 415);

    const presentation = await createDocumentData('bai-giang');
    const editedFile = await makeEditedContract('X');
    const pptx = await saveDocument(presentation.id, editedFile);
    assert.deepEqual(pptx.json(), { code: 409, message: 'Loại tài liệu này chưa hỗ trợ chỉnh sửa', data: null });

    const tooLarge = await saveDocument(document.id, Buffer.alloc(21 * 1024 * 1024));
    assert.equal(tooLarge.statusCode, 413);
    assert.equal(tooLarge.json().data, null);

    const missing = await saveDocument('00000000-0000-4000-8000-000000000000', editedFile);
    assert.equal(missing.statusCode, 404);
  });
});

function renameDocument(documentId: string, body: object) {
  return testApp.app.inject({ method: 'PATCH', url: `/api/documents/${documentId}`, payload: body });
}

describe('PATCH /api/documents/:id', () => {
  test('đổi tiêu đề (bỏ khoảng trắng 2 đầu), file không đổi, tải xuống theo tên mới', async () => {
    const document = await createDocumentData('hop-dong-lao-dong');
    const hashBefore = await getFileHash(`documents/demo/${document.id}.docx`);

    const res = await renameDocument(document.id, { title: '  HĐLĐ Nguyễn Văn A  ' });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().code, 200);
    assert.equal(res.json().message, 'Đã đổi tên tài liệu');
    assert.equal(res.json().data.title, 'HĐLĐ Nguyễn Văn A');

    assert.equal((await getUrl(`/api/documents/${document.id}`)).json().data.title, 'HĐLĐ Nguyễn Văn A');
    assert.equal(await getFileHash(`documents/demo/${document.id}.docx`), hashBefore);

    const download = await getUrl(document.downloadUrl);
    assert.equal(
      download.headers['content-disposition'],
      `attachment; filename*=UTF-8''${encodeURIComponent('HĐLĐ Nguyễn Văn A.docx')}`,
    );
  });

  test('tiêu đề rỗng / toàn khoảng trắng / quá 200 ký tự / thiếu trả 400, không có tài liệu trả 404', async () => {
    const document = await createDocumentData('bai-giang');

    for (const body of [{ title: '' }, { title: '   ' }, { title: 'a'.repeat(201) }, {}]) {
      const res = await renameDocument(document.id, body);
      assert.equal(res.statusCode, 400, JSON.stringify(body));
      assert.equal(res.json().data, null);
    }

    const missing = await renameDocument('00000000-0000-4000-8000-000000000000', { title: 'X' });
    assert.deepEqual(missing.json(), { code: 404, message: 'Không tìm thấy tài liệu', data: null });
  });
});

describe('GET /api/documents/:id/download', () => {
  test('tài liệu chưa sửa tải về giống hệt file mẫu', async () => {
    const document = await createDocumentData('gioi-thieu-du-an');

    const res = await getUrl(document.downloadUrl);
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['content-type'], 'application/vnd.openxmlformats-officedocument.presentationml.presentation');

    const templateContent = await readFile(path.join(testApp.storageRoot, 'templates/pptx/gioi-thieu-du-an.pptx'));
    assert.ok(res.rawPayload.equals(templateContent));

    const copiedFile = await stat(path.join(testApp.storageRoot, `documents/demo/${document.id}.pptx`));
    assert.equal(Number(res.headers['content-length']), copiedFile.size);
  });
});
