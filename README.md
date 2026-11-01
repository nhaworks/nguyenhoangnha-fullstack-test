# Thư viện mẫu tài liệu

Hai sản phẩm dùng chung một backend và một frontend:

- **Bài 1 – Văn bản**: thư viện mẫu DOCX → tìm, lọc, xem trước → tạo tài liệu → sửa trong editor tích hợp → lưu / tải .docx.
- **Bài 2 – Trình chiếu**: thư viện bộ mẫu PPTX → tìm, lọc, xem từng slide → tạo bản sao độc lập → tải .pptx.

Danh mục bàn giao: [BAN-GIAO.md](BAN-GIAO.md).

## Công nghệ

| Phần | Công nghệ |
|---|---|
| Backend (`server/`, cổng 3000) | Node.js 22, Fastify 5, TypeScript, Drizzle ORM, MySQL 8 |
| Frontend (`client/`, cổng 5173) | React 19, Vite, TypeScript, Tailwind CSS 4, axios |
| Editor DOCX | `@docx-editor.dev/react` (chạy trong trình duyệt, sửa thẳng file .docx) |
| Kiểm thử | `node:test` + `app.inject()` |

## Kiến trúc

![Kiến trúc client và server](docs/architecture.png)

Backend chia module theo nghiệp vụ (`templates`, `categories`, `documents`), mỗi module 4 tầng:

```
Routes ──► Controller ──► Service ──► Repository ──► MySQL
```

Frontend chia module `templates`, `documents`, mỗi tầng chỉ gọi tầng ngay dưới:

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

## Cài đặt và chạy

Cần: **Node.js 22+**, **MySQL 8.0+** đang chạy ở `127.0.0.1:3306`, user `root` không mật khẩu (khác thì xem [Cấu hình](#cấu-hình)).

**Terminal 1 – Backend**

```bash
cd server
npm install
npm run db:migrate
npm run dev
```

**Terminal 2 – Frontend**

```bash
cd client
npm install
npm run dev
```

Mở http://localhost:5173.

### Cấu hình

Không cần file `.env` nếu dùng giá trị mặc định. Muốn đổi thì tạo `server/.env` (mẫu: `server/.env.example`):

| Biến | Mặc định |
|---|---|
| `DB_HOST` · `DB_PORT` | `127.0.0.1` · `3306` |
| `DB_USER` · `DB_PASSWORD` | `root` · (trống) |
| `DB_NAME` · `TEST_DB_NAME` | `template_library` · `template_library_test` |
| `PORT` | `3000` |
| `STORAGE_ROOT` | `server/storage` |
| `DEFAULT_USER_ID` | `demo` |

Backend chạy địa chỉ khác thì đặt `API_PROXY_TARGET` trong `client/.env` (mặc định `http://127.0.0.1:3000`).

## API và dữ liệu

- Swagger UI: http://localhost:3000/api/docs (hoặc http://localhost:5173/api/docs) · OpenAPI JSON: `/api/docs/json`.

![Sơ đồ cơ sở dữ liệu](docs/erd.png)

## Lưu trữ và tạo bản sao

- File nằm trong `server/storage/`; DB chỉ lưu đường dẫn tương đối, mọi đường dẫn được kiểm tra không ra ngoài thư mục cho phép.
- `storage/templates/` (mẫu gốc) chỉ đọc. Tạo tài liệu = copy file mẫu sang `storage/documents/demo/<uuid>.<docx|pptx>` cùng transaction với bản ghi DB, lỗi thì xoá file dở. File mẫu gốc không bao giờ bị sửa.
- Lưu DOCX: editor gửi nguyên file .docx, server kiểm tra định dạng, ghi file tạm rồi đổi tên.
- Thêm mẫu mới: chép file vào `storage/templates/<docx|pptx>/`, ảnh trang / slide vào `storage/previews/<id>/1.png, 2.png…`, thêm một mục vào `storage/templates/manifest.json`, khởi động lại server. Không phải sửa giao diện.

## Kiểm thử

```bash
cd server
npm test
npm run test:cases
```

`npm test` chạy toàn bộ test trên database `template_library_test`. `npm run test:cases` chạy 44 test case chức năng trong `docs/test-cases.csv` (Bài 1 `VB-xxx`, Bài 2 `TC-xxx`, có case biên và case lỗi) và ghi kết quả ra `docs/test-cases-result.csv`.

## Trạng thái

Chi tiết từng tính năng: [docs/features.xlsx](docs/features.xlsx).

**Đã hoàn thành**: toàn bộ chức năng của hai sản phẩm theo đề: thư viện mẫu, tìm kiếm (không dấu), lọc danh mục, xem trước, tạo tài liệu / bản trình chiếu từ mẫu, sửa DOCX trong editor (tự lưu), đổi tên, tải .docx / .pptx, quản lý tài liệu đã tạo.

**Chưa hoàn thành**:
- Chưa có editor slide PPTX trong ứng dụng: tạo bản sao, xem ảnh slide, tải .pptx rồi sửa bằng PowerPoint / LibreOffice.
- Chưa có đăng nhập (mọi tài liệu thuộc user `demo`), chưa xoá tài liệu, danh sách tài liệu chưa phân trang.

**Giới hạn kỹ thuật**:
- Editor DOCX (bản core) giữ định dạng cơ bản (heading, đậm, danh sách, bảng); chỉ xuất .docx, chưa xuất PDF.
- Ảnh xem trước được tạo sẵn cùng bộ mẫu, không tự sinh khi thêm mẫu mới.
- Tìm kiếm không dấu dựa vào collation `utf8mb4_0900_ai_ci` nên cần MySQL 8.0+.

**Hướng mở rộng**: tích hợp ONLYOFFICE Docs hoặc Collabora Online (WOPI) để sửa PPTX / DOCX đầy đủ ngay trong trình duyệt; thêm đăng nhập, xoá tài liệu, phân trang; sinh ảnh xem trước tự động bằng LibreOffice khi thêm mẫu.

## Thư viện bên thứ ba

| Thư viện | Dùng cho | Giấy phép |
|---|---|---|
| @docx-editor.dev/react 2.33 | Editor DOCX trong trình duyệt (bản core) | Apache-2.0 |

## Ghi chú

Dự án có dùng AI (Claude Code) hỗ trợ:

| Hạng mục | Nội dung |
|---|---|
| Viết test case | Bộ test case chức năng `docs/test-cases.csv` |
| Sinh mã test case | Autotest `server/test/testcases.test.ts` và reporter ghi kết quả |
| Sinh tài liệu | README, BAN-GIAO.md, features.xlsx, bộ mẫu DOCX / PPTX |
| Hỗ trợ sinh mã code | Một phần mã backend và frontend |
