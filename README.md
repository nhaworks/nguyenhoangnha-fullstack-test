# Thư viện mẫu tài liệu

Hai sản phẩm dùng chung một backend và một frontend:

- **Bài 1 – Văn bản**: thư viện mẫu DOCX → tìm, lọc, xem trước → tạo tài liệu → sửa trong editor tích hợp → lưu / tải .docx.
- **Bài 2 – Trình chiếu**: thư viện bộ mẫu PPTX → tìm, lọc, xem từng slide → tạo bản sao độc lập → tải .pptx.

Danh mục bàn giao: [BAN-GIAO.md](BAN-GIAO.md).

## Video demo

![Demo luồng chính của Bài 1 và Bài 2](docs/demo.gif) [docs/demo-recording.mp4](docs/demo-recording.mp4)

## Kiến trúc

![Kiến trúc client và server](docs/architecture.png)

Backend chia module theo nghiệp vụ `templates`, `categories`, `documents`:

```
Routes ──► Controller ──► Service ──► Repository ──► MySQL
```

Frontend chia module `templates`, `documents`:

```
pages / components ──► hooks ──► application ──► api ──► /api (Vite proxy)
```

```
nguyenhoangnha-fullstack-test/
├── server/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── templates/
│   │   │   ├── categories/
│   │   │   └── documents/
│   │   ├── db/
│   │   ├── app.ts
│   │   ├── config.ts
│   │   ├── openapi.ts
│   │   ├── response.ts
│   │   └── storage.ts
│   ├── drizzle/
│   ├── storage/
│   │   ├── templates/
│   │   └── previews/
│   └── test/
├── client/
│   └── src/
│       ├── app/
│       ├── modules/
│       │   ├── templates/
│       │   └── documents/
│       └── shared/
└── docs/
    ├── architecture.png
    ├── erd.png
    ├── features.xlsx
    ├── test-cases.csv
    └── test-cases-result.csv
```

## Hướng dẫn cài đặt và chạy thử

Yêu cầu: **Node.js 22+**, **MySQL 8.0+**

**Terminal 1 – Backend**

```bash
cd server
cp .env.example .env
npm install
npm run db:migrate
npm run dev
```

**Terminal 2 – Frontend**

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

Mở http://localhost:5173

### Cấu hình

| Biến | Mặc định |
|---|---|
| `DB_HOST` · `DB_PORT` | `127.0.0.1` · `3306` |
| `DB_USER` · `DB_PASSWORD` | `root` · "" |
| `DB_NAME` · `TEST_DB_NAME` | `template_library` · `template_library_test` |
| `PORT` | `3000` |
| `STORAGE_ROOT` | `server/storage` |
| `DEFAULT_USER_ID` | `demo` |

## Trình bày kỹ thuật

### Công nghệ

| Phần | Công nghệ |
|---|---|
| Frontend (`client/`, port 5173) | React 19, Vite 8, TypeScript, Tailwind CSS 4, axios |
| Backend (`server/`, port 3000) | Node.js 22, Fastify 5, TypeScript (strict) |
| Cơ sở dữ liệu | MySQL 8, Drizzle ORM: schema ở `server/src/db/schema.ts`, migration sinh tự động ở `server/drizzle/` |
| Editor DOCX | `@docx-editor.dev/react`, chạy trên trình duyệt, sửa thẳng file .docx |
| Tài liệu API | OpenAPI 3 sinh từ JSON schema của route (`@fastify/swagger`, `@fastify/swagger-ui`) |
| Kiểm thử | `node:test` + `app.inject()` của Fastify |

### Cấu trúc API và mô hình dữ liệu

Tài liệu API đầy đủ (tham số, body, response mẫu): Swagger UI http://localhost:3000/api/docs, file OpenAPI http://localhost:3000/api/docs/json.

| Nhóm API | Chức năng |
|---|---|
| `/api/templates`, `/api/categories` | Danh sách mẫu theo loại (`type`), tìm kiếm (`q`), lọc danh mục (`category`), chi tiết mẫu kèm ảnh xem trước, đọc file mẫu |
| `/api/templates/:id/documents` | Tạo tài liệu mới từ mẫu |
| `/api/documents` | Danh sách tài liệu đã tạo, xem thông tin, lưu file .docx từ editor, đổi tên, tải xuống |
| `/files/previews/*` | Ảnh xem trước và thumbnail |

Mọi response JSON cùng một dạng, `code` luôn bằng HTTP status, lỗi thì `data` là `null`:

```json
{ "code": 200, "message": "Thành công", "data": { } }
{ "code": 404, "message": "Không tìm thấy mẫu", "data": null }
```

Endpoint trả file (file mẫu, ảnh xem trước, tải tài liệu) trả nhị phân, không bọc.

| Mã | Khi nào |
|---|---|
| 200 / 201 | Thành công / tạo tài liệu thành công |
| 400 | Tham số hoặc body sai định dạng, file gửi lên không phải .docx |
| 404 | Không tìm thấy mẫu, tài liệu, file hoặc đường dẫn |
| 409 | Lưu đè loại tài liệu chưa hỗ trợ chỉnh sửa (PPTX) |
| 413 | File lưu vượt 20 MB |
| 415 | Lưu tài liệu nhưng Content-Type không phải DOCX |
| 500 | Lỗi máy chủ (ghi log, không trả stack hay đường dẫn file) |
| 503 | `/api/health` không kết nối được cơ sở dữ liệu |

![Sơ đồ cơ sở dữ liệu](docs/erd.png)

| Bảng | Nội dung |
|---|---|
| `doc_types` | Loại tài liệu: `code` (docx, pptx), tên, phần mở rộng |
| `categories` | Danh mục: `slug`, tên, mô tả |
| `templates` | Mẫu: `slug`, loại, danh mục, tên, mô tả, `file_path` |
| `template_previews` | Ảnh xem trước theo thứ tự `position`; ảnh `position = 1` là thumbnail |
| `documents` | Tài liệu tạo từ mẫu: `uuid`, mẫu gốc, tiêu đề, `file_path`, `created_at`, `updated_at` (lần lưu gần nhất) |

- Khoá chính `id` INT tự tăng chỉ dùng trong DB và khoá ngoại. API dùng khoá công khai (`slug` của mẫu / danh mục, `uuid` của tài liệu) trả dưới tên `id`, không lộ id số.
- Loại của tài liệu lấy qua `documents → templates → doc_types`, không lặp cột loại.
- Database dùng collation `utf8mb4_0900_ai_ci` nên tìm `hop dong` ra `Hợp đồng…` (bỏ qua hoa thường và dấu tiếng Việt) mà không cần cột phụ.

### Lưu trữ, quản lý và phân phối template

Mọi file nằm trong `server/storage/`; database chỉ lưu đường dẫn tương đối, không lưu nội dung file.

| Thư mục | Nội dung |
|---|---|
| `storage/templates/manifest.json` | Khai báo loại tài liệu, danh mục và danh sách mẫu |
| `storage/templates/<loại>/<id>.<đuôi>` | File mẫu gốc, chỉ đọc lúc chạy |
| `storage/previews/<id>/1.png, 2.png…` | Ảnh xem trước từng trang / slide |
| `storage/documents/demo/<uuid>.<đuôi>` | Tài liệu người dùng tạo (không commit) |

**Quản lý:** khi khởi động, server đọc `manifest.json` và upsert loại, danh mục, mẫu, ảnh xem trước vào DB theo `code` / `slug` (chạy lại không đổi id). Danh sách mẫu và danh mục ở giao diện đều lấy từ API, không hardcode.

**Phân phối:** ảnh xem trước qua `/files/previews/<id>/<n>.png`, file mẫu qua `/api/templates/:id/file`, tài liệu qua `/api/documents/:id/download` (tên file tải về theo tiêu đề tài liệu). MIME suy theo phần mở rộng tại một chỗ (`server/src/storage.ts`). Mọi đường dẫn đi qua `getStoragePath()`: resolve rồi kiểm tra còn nằm trong thư mục cho phép, nên chặn được path traversal; client không bao giờ gửi đường dẫn file.

**Thêm mẫu mới** (không sửa code frontend hay backend):

1. Chép file vào `storage/templates/<loại>/<id>.<đuôi>`, tên file trùng `id` khai trong manifest, vd. `storage/templates/docx/don-xin-nghi-phep.docx`.
2. Thêm ảnh xem trước vào `storage/previews/<id>/`, đặt tên `1.png`, `2.png`… (không có ảnh thì giao diện hiện icon tài liệu).
3. Thêm `{ "id", "type", "category", "name", "description" }` vào `templates` của `manifest.json`; danh mục mới thì thêm vào `categories`.
4. Khởi động lại server.

### Tạo bản sao tài liệu không sửa file gốc

- **Tạo tài liệu:** `copyFile(mẫu, storage/documents/demo/<uuid>.<đuôi>, COPYFILE_EXCL)` và `INSERT documents` chạy trong cùng một transaction; lỗi thì rollback và xoá file dở. Tên file là UUID nên không ghi đè file có sẵn.
- **File mẫu chỉ đọc:** không có code nào mở `storage/templates/` ở chế độ ghi; tài liệu luôn trỏ tới bản sao riêng của nó.
- **Sửa DOCX:** editor chạy trên trình duyệt tải bản sao về, sửa thẳng trên DOCX rồi `PUT /api/documents/:id` gửi lại nguyên file. Server kiểm tra đúng là .docx, ghi file tạm rồi `rename` (không bao giờ để lại file ghi dở), cập nhật `updated_at`. Không chuyển qua HTML nên giữ được định dạng gốc.
- **Tự lưu:** 2 giây sau lần gõ cuối; quay lại danh sách hoặc tải xuống thì lưu xong mới đi; ẩn tab thì lưu ngay.
- **PPTX:** bản sao là file độc lập, tải về mở bằng PowerPoint, LibreOffice Impress hoặc Keynote.

### Xử lý lỗi và kiểm thử

**Xử lý lỗi**

- Mọi input (params, query, body) validate bằng JSON schema của Fastify; route lưu tài liệu giới hạn 20 MB.
- Service ném `AppError(status, message)`; error handler chung đổi thành response chuẩn ở trên. Lỗi không lường trước trả 500, chỉ ghi log ở server.
- Từ khoá tìm kiếm được escape `%`, `_`, `\` trước khi đưa vào `LIKE`; truy vấn qua Drizzle có tham số, không nối chuỗi SQL.
- Frontend: axios interceptor đổi mọi lỗi thành `ApiError` với câu tiếng Việt từ server. Mọi màn có dữ liệu đều có trạng thái đang tải, lỗi (nút Thử lại), rỗng / không tìm thấy (nút Xoá bộ lọc). Tạo hoặc lưu tài liệu lỗi thì báo bằng toast; rời trang khi còn nội dung chưa gửi được thì trình duyệt hỏi lại.

**Kiểm thử**

```bash
cd server
npm test
npm run test:cases
```

`npm test` gọi API qua `app.inject()` (không mở cổng) trên database riêng `template_library_test` và thư mục storage tạm, không đụng dữ liệu thật. Các luồng quan trọng có test:

- Tìm `hop dong` ra `Hợp đồng lao động`; ký tự `%`, `_` được tìm đúng nghĩa đen; lọc theo danh mục.
- Tạo tài liệu: SHA-256 file mẫu gốc không đổi; tài liệu chưa sửa tải về giống hệt mẫu.
- Lưu DOCX: file tải về vẫn còn heading, chữ đậm, danh sách, bảng; `updated_at` tăng.
- Chặn path traversal ở `/files/previews/*`.
- Mã lỗi 400 / 404 / 409 / 413 / 415; mọi response JSON có dạng `{ code, message, data }`.
- Swagger có đủ endpoint; seed chạy lại không đổi id.

`npm run test:cases` chạy 44 test case chức năng trong `docs/test-cases.csv` (`VB-xxx` Bài 1, `TC-xxx` Bài 2) và ghi kết quả ra `docs/test-cases-result.csv`.

### Thư viện bên thứ ba

| Thư viện | Phiên bản | Dùng cho | Giấy phép |
|---|---|---|---|
| fastify | 5.12.7 | HTTP server | MIT |
| @fastify/swagger | 9.9.2 | Sinh OpenAPI từ schema của route | MIT |
| @fastify/swagger-ui | 6.1.2 | Giao diện Swagger `/api/docs` | MIT |
| drizzle-orm | 0.45.4 | Schema và query builder MySQL | Apache-2.0 |
| mysql2 | 3.24.6 | Driver MySQL | MIT |
| @docx-editor.dev/react | 2.33.0 | Editor DOCX trên trình duyệt | Apache-2.0 |

### Mở rộng cho loại tài liệu khác

Khác biệt theo loại tài liệu gom vào vài file khai báo, không rải trong logic, nên thêm loại mới (vd. XLSX) chỉ cần:

1. `manifest.json`: một dòng trong `docTypes` và các mẫu của loại đó.
2. `server/src/storage.ts`: MIME của phần mở rộng mới.
3. Client: nhãn và chữ gợi ý ô tìm kiếm trong `client/src/modules/templates/application/doc-types.ts`, một mục menu trong `client/src/app/menu.tsx`, một tab trong `client/src/modules/documents/application/document.application.ts`.

Loại mới dùng ngay được luồng tìm, lọc, xem trước, tạo bản sao và tải xuống. Muốn sửa trong ứng dụng thì thêm editor tương ứng như `DocxEditorPane`, hoặc tích hợp ONLYOFFICE / Collabora (xem Trạng thái).

## Trạng thái

Chi tiết từng tính năng: [docs/features.xlsx](docs/features.xlsx).

**Đã hoàn thành**: toàn bộ chức năng của hai sản phẩm theo yêu cầu của bài test

**Chưa hoàn thành**:
- Chưa có editor chỉnh sửa slide PPTX trong ứng dụng
- Chưa có đăng nhập jwt token, chưa xoá tài liệu, và danh sách tài liệu chưa phân trang.
- Chưa thực hiện reload lại ảnh preview khi sửa docx

**Giới hạn kỹ thuật**:
- Editor DOCX chưa test được các loại file phiên bản cũ
- Ảnh xem trước được tạo sẵn cùng bộ mẫu, không tự sinh khi thêm mẫu mới.
- Chưa có phân quyền: mọi tài liệu thuộc user `demo`

**Hướng mở rộng**: 
- Thêm phân quyền và xác thực user
- Thêm tự động cập nhật preview ảnh thumbnail
- Bổ sung phân trang nếu dữ liệu quá nhiều
- Mở rộng tích hợp ONLYOFFICE Docs hoặc Collabora để sửa PPTX / DOCX đầy đủ ngay trong trình duyệt

## Ghi chú

Dự án có dùng AI (Claude Code) hỗ trợ:

| Hạng mục | Nội dung |
|---|---|
| Viết test case | Bộ test case chức năng `docs/test-cases.csv` |
| Sinh mã test case | Autotest `server/test/testcases.test.ts` và reporter ghi kết quả |
| Sinh tài liệu | README, BAN-GIAO.md, features.xlsx, bộ mẫu DOCX / PPTX |
| Hỗ trợ sinh mã code | Một phần mã backend và frontend |
| Sinh seeder | `server/src/db/seed.ts` nạp loại tài liệu, danh mục, mẫu và ảnh xem trước từ `manifest.json` |
