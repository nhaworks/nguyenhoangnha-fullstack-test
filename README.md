# nguyenhoangnha-fullstack-test

Thư viện mẫu tài liệu (DOCX) và mẫu trình chiếu (PPTX). Dự án gồm 2 mã nguồn tách biệt:

| Thư mục   | Công nghệ                                   | Cổng mặc định |
|-----------|---------------------------------------------|---------------|
| `server/` | Fastify + TypeScript + MySQL (Drizzle ORM)  | 3000          |
| `client/` | React + Vite + TypeScript                   | 5173          |

## Kiến trúc

```
Trình duyệt ──► Vite dev server (5173) ──/api/*──► Fastify (3000) ──► MySQL (template_library)
```

- Client gọi đường dẫn tương đối `/api/...`. Vite proxy chuyển tiếp sang Fastify, nên không cần cấu hình CORS và không hardcode địa chỉ API.
- Cấu trúc DB khai báo bằng TypeScript trong `server/src/db/schema.ts`; migration SQL sinh tự động bằng drizzle-kit, nằm trong `server/drizzle/`.

### Kiến trúc backend

Code chia **module theo domain** (`templates`, `categories`, `documents`) trong `server/src/modules/<domain>/`. Trong mỗi module, request đi qua các tầng theo thứ tự:

```
Routes ──► Controller ──► Service ──► Repository ──► MySQL
```

| Tầng         | File                         | Việc của tầng                                          |
|--------------|------------------------------|--------------------------------------------------------|
| Routes       | `<domain>.routes.ts`         | Khai báo URL, JSON schema validate input               |
| Controller   | `<domain>.controller.ts`     | Nhận request, gọi service, trả response / status code  |
| Service      | `<domain>.service.ts`        | Xử lý nghiệp vụ, điều phối DB và file, transaction     |
| Repository   | `<domain>.repository.ts`     | Chỉ truy vấn DB qua Drizzle                            |

`src/app.ts` dựng app (`buildApp()`: error handler chung, đăng ký module), `src/index.ts` chỉ mở cổng; test dùng `buildApp()` + `app.inject()` không cần mở cổng.

### Kiến trúc frontend

React + Tailwind CSS v4, gọi API bằng axios. Code chia **theo module nghiệp vụ** (giống backend). Mỗi module tự chứa đủ 4 tầng của nó; mỗi tầng chỉ gọi tầng ngay dưới:

```
pages/ + components/ ──thao tác──► hooks/ ──► application/ ──► api/ (axios) ──► Backend
          ▲                           │
          └──── dữ liệu + trạng thái ─┘
```

| Thư mục | Nội dung |
|---|---|
| `src/modules/templates/` | Thư viện mẫu (dùng cho cả 2 menu): danh sách, tìm kiếm, lọc danh mục, dialog xem trước |
| `src/modules/documents/` | Tài liệu tạo từ mẫu: tạo bản sao, trang **Quản lý tài liệu** (danh sách + tải xuống); sau này: editor, trang kết quả trình chiếu |
| `src/shared/` | Dùng chung nhiều module: axios instance `api/http.ts`, điều hướng `navigation.ts`, hook chung (`useAsyncData`, `useDebouncedValue`, `useDialog`, `useCurrentPath`), component chung (`CardGrid`, `Thumbnail`, `ImageCarousel`, `FilterChips`, `SearchBox`, `StatusView`, `Toast`, `icons`) |
| `src/app/` | Khung ứng dụng: menu trái + page của từng menu (`menu.tsx`), các màn toàn màn hình không có dashboard (`fullScreenPages.tsx`, vd. trang sửa tài liệu), chuyển màn (`useNavigation`), `DashboardLayout`, `Sidebar` |

| Tầng trong module | Việc của tầng |
|---|---|
| `api/` | Gọi HTTP bằng axios (`shared/api/http.ts`), trả phần `data` trong `{ code, message, data }`; kiểu dữ liệu ở `*.types.ts` |
| `application/` | Logic nghiệp vụ, TypeScript thuần (không React): bộ lọc ↔ URL, carousel, chuẩn bị nhãn hiển thị |
| `hooks/` | State React: đang tải / lỗi / dữ liệu, debounce tìm kiếm, phím mũi tên; gọi `application/`, không gọi `api/` |
| `components/`, `pages/` | Chỉ hiển thị (Tailwind) và gọi callback của hook; không gọi API, không chứa logic |

Module này dùng module khác qua **hook** của nó (vd. trang thư viện mẫu dùng `documents/hooks/useCreateDocument`). `shared/` không phụ thuộc module nào.

- Dashboard giao diện sáng, menu trái có 3 mục:
  - **Mẫu tài liệu** (`/templates/docx`) và **Mẫu trình chiếu** (`/templates/pptx`): dùng chung `TemplateLibraryPage` với prop `docType`.
  - **Quản lý tài liệu** (`/documents?type=docx|pptx`): tab **Tài liệu** / **Trình chiếu** (kèm số lượng), lưới thẻ các tài liệu user đã tạo, sửa gần nhất lên đầu, mỗi thẻ có trạng thái "Chưa chỉnh sửa · tạo lúc …" / "Cập nhật lúc …". Bấm **Chỉnh sửa** mở `/documents/:id` ở **màn hình riêng, không có menu dashboard**: tài liệu DOCX mở trong docx-editor; nút quay lại, nút trạng thái lưu (**Lưu** / **Đang lưu…** / **Đã lưu**, bấm hoặc Cmd/Ctrl+S để lưu ngay) và **Tải xuống** nằm ngay trên thanh tiêu đề của editor, không chiếm thêm hàng nào. **Tự lưu**: 2 giây sau lần gõ cuối; bấm quay lại hoặc Tải xuống thì lưu xong mới đi; chuyển tab / ẩn trình duyệt thì lưu ngay; refresh hoặc đóng tab thì gửi bản mới nhất bằng `fetch keepalive` (editor chuẩn bị sẵn bản .docx 0,4 giây sau mỗi lần gõ). Chỉ khi vừa gõ trong 0,4 giây cuối, hoặc file > 60 KB (giới hạn keepalive của trình duyệt), trình duyệt mới hỏi "Rời trang?" vì phần đó chưa kịp gửi. Tài liệu PPTX: thanh 1 dòng + xem ảnh slide và tải về.
- Trạng thái màn hình (từ khoá, danh mục, mẫu đang xem trước) nằm trên URL, vd. `/templates/pptx?q=bao%20cao&category=bao-cao&preview=bai-giang`: F5 hay gửi link vẫn mở đúng màn, Back / Forward hoạt động.
- Loại tài liệu và chữ hiển thị riêng của từng loại (tiêu đề, mô tả, ô tìm kiếm, "trang" / "slide") khai một chỗ trong `src/modules/templates/application/doc-types.ts`; menu trong `src/app/menu.tsx` (mỗi mục khai path, nhãn, icon, page). Thêm loại mới (vd. xlsx) = 1 phần tử ở mỗi file, không sửa component.
- Chỉ hiển thị dữ liệu có thật từ API: số mẫu, danh mục, ảnh xem trước. Không có số liệu hay nút minh hoạ chưa dùng được.
- Danh sách mẫu và danh mục lấy từ API, không hardcode ở client.

```
nguyenhoangnha-fullstack-test/
├── server/
│   ├── src/
│   │   ├── index.ts          # seed + listen
│   │   ├── app.ts            # buildApp(): Fastify, error handler, đăng ký module
│   │   ├── config.ts         # biến môi trường
│   │   ├── errors.ts         # AppError(statusCode, message)
│   │   ├── response.ts       # sendSuccess / sendError / sendFile: dạng { code, message, data }
│   │   ├── storage.ts        # đường dẫn an toàn trong storage/, MIME theo đuôi file
│   │   ├── modules/          # templates/ categories/ documents/
│   │   └── db/
│   │       ├── schema.ts     # cấu trúc DB (nguồn sự thật)
│   │       ├── index.ts      # pool mysql2 + drizzle
│   │       ├── migrate.ts    # tạo DB nếu chưa có + chạy migration
│   │       └── seed.ts       # upsert loại / danh mục / mẫu / preview từ manifest.json
│   ├── source/               # file gốc để dựng mẫu: docx/ (có sẵn) + docx|pptx tự sinh
│   ├── scripts/samples.py    # source/ → storage/templates + storage/previews
│   ├── storage/              # templates/ previews/ (commit) · documents/ (gitignore)
│   ├── test/                 # node:test + app.inject()
│   ├── drizzle/              # migration SQL sinh tự động
│   ├── drizzle.config.ts
│   └── package.json
├── client/
│   ├── src/
│   │   ├── app/              # menu.tsx, fullScreenPages.tsx, useNavigation, DashboardLayout, Sidebar
│   │   ├── modules/
│   │   │   ├── templates/    # api/ application/ hooks/ components/ pages/TemplateLibraryPage
│   │   │   └── documents/    # api/ application/ hooks/ components/DocumentList pages/DocumentListPage
│   │   ├── shared/           # api/http.ts, hooks/ (useAsyncData, useDebouncedValue, useDialog), components/ (SearchBox, StatusView, Toast, icons)
│   │   ├── App.tsx
│   │   └── index.css         # @import "tailwindcss"
│   ├── .env.example          # API_PROXY_TARGET (copy thành .env)
│   └── vite.config.ts        # proxy /api, /files -> API_PROXY_TARGET
└── docs/
    ├── de-bai.md             # đề bài gốc
    ├── database.md           # mô hình dữ liệu
    └── features.xlsx         # tính năng dự kiến + trạng thái (1 sheet)
```

## Yêu cầu

- Node.js **>= 22**
- MySQL **8.0+** (đã chạy thử trên 9.6), mặc định user `root`, mật khẩu rỗng, tại `127.0.0.1:3306`

```bash
node -v
mysql --version
```

## Cài đặt và chạy

Mở **2 terminal** tại thư mục gốc của dự án.

**Terminal 1 – Backend**

```bash
cd server
npm install
cp .env.example .env # rồi sửa thông tin MySQL trong .env nếu cần
npm run db:migrate   # tạo database template_library nếu chưa có + tạo bảng
npm run dev          # khi khởi động tự seed mẫu từ storage/templates/manifest.json
```

Kiểm tra server và kết nối DB:

```bash
curl http://localhost:3000/api/health
```

**Terminal 2 – Frontend**

```bash
cd client
npm install
cp .env.example .env # đổi API_PROXY_TARGET nếu backend không chạy ở 127.0.0.1:3000
npm run dev
```

Mở http://localhost:5173 → menu **Mẫu tài liệu** (mẫu văn bản) hoặc **Mẫu trình chiếu** (mẫu PPTX): ô tìm kiếm, hàng chip danh mục để lọc, lưới mẫu 4 cột; rê chuột vào mẫu để **Xem trước** (carousel ảnh + thông tin) hoặc **Tạo mẫu**. Menu **Quản lý tài liệu**: danh sách tài liệu đã tạo, tải xuống từng file.

## Cơ sở dữ liệu

Xem chi tiết bảng và lý do thiết kế ở [docs/database.md](docs/database.md).

| Lệnh (trong `server/`)                     | Việc làm                                                        |
|--------------------------------------------|-----------------------------------------------------------------|
| `npm run db:generate -- --name <ten>`      | Sinh file migration SQL từ thay đổi trong `src/db/schema.ts`    |
| `npm run db:migrate`                       | Tạo database nếu chưa có, áp dụng migration còn thiếu           |

Reset dữ liệu:

```bash
mysql -uroot -h127.0.0.1 -e "DROP DATABASE template_library"
```

Sau đó chạy lại `npm run db:migrate`.

## API

Mọi response JSON cùng một dạng `{ code, message, data }`, trong đó `code` luôn bằng HTTP status. Endpoint trả file (ảnh preview, file mẫu, tải xuống) trả nhị phân, không bọc.

```json
{ "code": 200, "message": "Thành công", "data": { … } }
```

```json
{ "code": 404, "message": "Không tìm thấy mẫu", "data": null }
```

| Trường | Ý nghĩa |
|---|---|
| `code` | HTTP status dạng số: 200, 201, 400, 404, 409, 413, 500, 503 |
| `message` | Câu cho người dùng (vd. `Đã tạo tài liệu`, `Không tìm thấy mẫu`) |
| `data` | Dữ liệu trả về; `null` khi lỗi. Các mục bên dưới chỉ ghi phần `data` |

| `code` | Khi nào | `message` ví dụ |
|---|---|---|
| 200 | Đọc / lưu thành công | `Thành công`, `Đã lưu tài liệu` |
| 201 | Tạo tài liệu thành công | `Đã tạo tài liệu` |
| 400 | Tham số / body sai (id sai định dạng, `title` rỗng, file lưu lên không phải .docx…) | `File gửi lên không phải định dạng .docx` |
| 404 | Không có mẫu / tài liệu / file / route | `Không tìm thấy mẫu`, `Không tìm thấy tài liệu`, `Không tìm thấy file` |
| 409 | Lưu nội dung cho loại chưa có editor (pptx) | `Loại tài liệu này chưa hỗ trợ chỉnh sửa` |
| 413 | File .docx lưu lên > 20 MB | `Request body is too large` |
| 415 | Lưu tài liệu mà không gửi nội dung file .docx | `Cần gửi nội dung file .docx (Content-Type DOCX)` |
| 500 | Lỗi lạ; chi tiết chỉ ghi log, không trả stack / đường dẫn | `Lỗi máy chủ, vui lòng thử lại` |
| 503 | `/api/health` không kết nối được DB | `Không kết nối được cơ sở dữ liệu` |

### `GET /api/health`

**200** `data: { "status": "ok" }` · **503**

### `GET /api/templates?type=&q=&category=`

Danh sách mẫu, sắp theo tên. Mọi tham số đều tuỳ chọn.

| Tham số | Ý nghĩa |
|---|---|
| `type` | `docx` \| `pptx` |
| `q` | Từ khoá (≤ 100 ký tự), tìm trong tên + mô tả, **không phân biệt hoa thường và dấu**: `hop dong` khớp `Hợp đồng`. `%` `_` `\` được hiểu đúng nghĩa đen |
| `category` | id danh mục, vd. `giao-duc` |

**200**

```json
{
  "code": 200,
  "message": "Thành công",
  "data": [
    {
      "id": "hop-dong-lao-dong",
      "type": "docx",
      "name": "Hợp đồng lao động",
      "description": "Hợp đồng lao động giữa doanh nghiệp và người lao động: …",
      "category": { "id": "hanh-chinh", "name": "Hành chính" },
      "thumbnailUrl": "/files/previews/hop-dong-lao-dong/1.png"
    }
  ]
}
```

`thumbnailUrl` là `null` nếu mẫu chưa có ảnh preview (UI hiện icon theo loại).

### `GET /api/categories?type=`

Danh mục có mẫu (của `type`, nếu truyền), kèm số mẫu.

**200** `data: [ { "id": "giao-duc", "name": "Giáo dục", "description": "…", "total": 2 } ]`

### `GET /api/templates/:id`

Chi tiết mẫu + toàn bộ ảnh xem trước (trang DOCX / slide PPTX) theo thứ tự.

**200** — `data`:

```json
{
  "id": "gioi-thieu-du-an", "type": "pptx", "name": "Giới thiệu dự án", "description": "…",
  "category": { "id": "kinh-doanh", "name": "Kinh doanh" },
  "thumbnailUrl": "/files/previews/gioi-thieu-du-an/1.png",
  "fileUrl": "/api/templates/gioi-thieu-du-an/file",
  "previews": [ { "position": 1, "url": "/files/previews/gioi-thieu-du-an/1.png" } ],
  "createdAt": "2026-10-31T16:00:00.000Z", "updatedAt": "2026-10-31T16:00:00.000Z"
}
```

**404** không có mẫu

### `GET /api/templates/:id/file`

Stream file mẫu gốc (chỉ đọc) để client tự render xem trước DOCX. `Content-Type` theo đuôi file. **404** không có mẫu / file.

### `GET /files/previews/{templateId}/{n}.png`

Ảnh preview / thumbnail (`n = 1`). Đường dẫn bị khoá trong `storage/previews/`: `../`, đường dẫn tuyệt đối, ký tự NUL → **404**.

### `POST /api/templates/:id/documents`

Tạo tài liệu mới từ mẫu. Body tuỳ chọn: `{ "title": "HĐLĐ Nguyễn Văn A" }` (1–200 ký tự, mặc định = tên mẫu).

**201** + header `Location: /api/documents/{id}`

```json
{
  "code": 201,
  "message": "Đã tạo tài liệu",
  "data": {
    "id": "03ad6841-30ed-451a-b0db-15364e8d2ca4",
    "templateId": "hop-dong-lao-dong",
    "templateName": "Hợp đồng lao động",
    "type": "docx",
    "title": "HĐLĐ Nguyễn Văn A",
    "editable": true,
    "downloadUrl": "/api/documents/03ad6841-30ed-451a-b0db-15364e8d2ca4/download",
    "createdAt": "2026-10-31T16:09:54.000Z",
    "updatedAt": "2026-10-31T16:09:54.000Z"
  }
}
```

`editable` = loại có editor tích hợp (hiện chỉ `docx`). `updatedAt` = lần lưu gần nhất, bằng `createdAt` khi chưa sửa. **400** · **404** không có mẫu

### `GET /api/documents`

Danh sách tài liệu của user hiện tại (chưa có đăng nhập: `DEFAULT_USER_ID`, file nằm trong `storage/documents/<user>/`), cả .docx và .pptx, sửa gần nhất lên đầu. Mỗi tài liệu có thêm `thumbnailUrl` (ảnh trang / slide đầu của mẫu gốc). Chưa phân trang.

**200**

```json
{
  "code": 200,
  "message": "Thành công",
  "data": [
    {
      "id": "8548dbf0-b0b7-415c-8b20-faa0a1748d4d",
      "templateId": "gioi-thieu-du-an",
      "templateName": "Giới thiệu dự án",
      "type": "pptx",
      "title": "Giới thiệu dự án",
      "editable": false,
      "downloadUrl": "/api/documents/8548dbf0-b0b7-415c-8b20-faa0a1748d4d/download",
      "thumbnailUrl": "/files/previews/gioi-thieu-du-an/1.png",
      "createdAt": "2026-11-01T04:10:52.000Z",
      "updatedAt": "2026-11-01T04:10:52.000Z"
    }
  ]
}
```

### `GET /api/documents/:id`

Thông tin tài liệu, `data` cùng dạng như `POST` ở trên. Editor lấy nội dung file qua `GET /api/documents/:id/download`. **400** id không phải UUID · **404**

### `PUT /api/documents/:id`

Lưu tài liệu DOCX sau khi sửa trong editor. Body là **nguyên nội dung file .docx** do editor xuất ra (`editorRef.save()`), không phải JSON:

```
PUT /api/documents/03ad6841-30ed-451a-b0db-15364e8d2ca4
Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document

<nội dung file .docx>
```

Server kiểm tra file đúng là .docx (file zip có `word/document.xml`), ghi file tạm rồi đổi tên đè lên file của tài liệu (file mẫu gốc không bị đụng tới) và cập nhật `updated_at`. File ≤ 20 MB.

**200** `message: "Đã lưu tài liệu"`, `data` = tài liệu sau khi lưu (`updatedAt` mới) · **400** không phải .docx · **404** · **409** loại chưa có editor (pptx) · **413** · **415** không gửi nội dung DOCX

### `GET /api/documents/:id/download`

Tải file (`Content-Disposition: attachment`, tên file = tiêu đề, giữ tiếng Việt qua `filename*`). Chưa sửa → bản sao giống hệt mẫu; đã sửa → bản lưu gần nhất. **404**

## Mẫu tài liệu và lưu trữ

```
server/source/                     # file gốc để dựng mẫu (commit)
├── docx/p1..p4.docx               # mẫu DOCX có sẵn
├── docx/hop-dong-lao-dong.docx    # tự sinh bởi scripts/samples.py
└── pptx/*.pptx                    # 3 bộ trình chiếu tự sinh
server/storage/
├── templates/manifest.json        # khai báo loại, danh mục, mẫu — nguồn duy nhất
├── templates/{docx|pptx}/{id}.{ext}   # file mẫu thật, chỉ đọc lúc chạy
├── previews/{id}/{n}.png          # ảnh trang / slide, n = 1 là thumbnail
└── documents/{user}/{uuid}.{ext}  # tài liệu người dùng tạo (gitignore); chưa có đăng nhập → user = demo
```

- **Tạo bản sao không sửa file gốc**: `copyFile(mẫu, documents/{user}/{uuid}.{ext}, COPYFILE_EXCL)` trong cùng transaction với `INSERT documents`; lỗi thì xoá file dở. File mẫu chỉ mở ở chế độ đọc. Test kiểm SHA-256 file mẫu trước / sau khi tạo và lưu.
- **Sửa và lưu DOCX**: trình duyệt tải file .docx về, mở bằng [docx-editor](https://www.docx-editor.dev/) (chạy hoàn toàn ở client, sửa thẳng trên DOCX nên giữ nguyên định dạng), khi lưu gửi lại nguyên file. Server ghi file tạm rồi `rename` (tải xuống không bao giờ gặp file ghi dở) và cập nhật `updated_at`. Trình chiếu (pptx) chưa có editor: xem ảnh slide và tải về.
- **Chặn path traversal**: mọi đường dẫn qua `src/storage.ts` (`storagePath(rel, scope)`), không bao giờ nhận đường dẫn file từ client.
- **Thêm / cập nhật mẫu** (không sửa code hay UI): chép file vào `server/source/`, thêm entry vào `manifest.json`, chạy `npm run samples` (copy vào `storage/templates/` + render ảnh), khởi động lại server (seed upsert). `npm run samples` cần [uv](https://docs.astral.sh/uv/) và LibreOffice; kết quả đã commit nên **chạy app không cần LibreOffice**.

```json
{ "id": "hop-dong-lao-dong", "type": "docx", "category": "hanh-chinh",
  "name": "Hợp đồng lao động", "description": "…", "source": "docx/hop-dong-lao-dong.docx" }
```

- **Thêm loại tài liệu** (vd. xlsx): 1 dòng `docTypes` trong manifest + 1 dòng MIME trong `storage.ts`; muốn sửa được trong app thì thêm converter vào `converters` trong `document.service.ts` (chỗ duy nhất rẽ nhánh theo loại).

## Kiểm thử

```bash
cd server
npm test
```

`node:test` + `app.inject()` (không mở cổng), database riêng `TEST_DB_NAME` (mặc định `template_library_test`, tự tạo + migrate; host / user / mật khẩu lấy từ `.env`) và bản sao tạm của `storage/`, nên không đụng dữ liệu thật. Có test cho: tìm `hop dong` ra `Hợp đồng…`; tạo / lưu tài liệu xong SHA-256 file mẫu không đổi; chặn path traversal; DOCX lưu xong vẫn còn heading, đậm, danh sách, bảng và `updated_at` tăng; file lưu lên không phải .docx bị từ chối; danh sách tài liệu đúng loại / sắp xếp; `code` trong body = HTTP status; mã lỗi 400 / 404 / 409 / 413.

## Biến môi trường (server)

Khai trong `server/.env` (copy từ `server/.env.example`; `.env` không commit). Không có `.env` thì dùng giá trị mặc định. Biến đặt sẵn trong môi trường (vd. `DB_PASSWORD=x npm run dev`) được ưu tiên hơn `.env`.

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PORT` | `3000` | Cổng của Fastify |
| `DB_HOST` | `127.0.0.1` | Máy MySQL |
| `DB_PORT` | `3306` | Cổng MySQL |
| `DB_USER` | `root` | User MySQL |
| `DB_PASSWORD` | (trống) | Mật khẩu MySQL |
| `DB_NAME` | `template_library` | Database của app |
| `TEST_DB_NAME` | `template_library_test` | Database cho `npm test` |
| `DEFAULT_USER_ID` | `demo` | Chủ tài liệu khi chưa có đăng nhập (`storage/documents/<user>/`) |
| `STORAGE_ROOT` | `server/storage` | Thư mục file mẫu, preview, tài liệu |

Client (`client/.env`, copy từ `client/.env.example`):

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `API_PROXY_TARGET` | `http://127.0.0.1:3000` | Địa chỉ backend; Vite chuyển tiếp `/api` và `/files` tới đây |

## Build production

```bash
cd server
npm run build
npm start
```

```bash
cd client
npm run build
npm run preview
```

## Thư viện bên thứ ba

| Thư viện     | Dùng cho                      | Giấy phép  |
|--------------|-------------------------------|------------|
| fastify      | HTTP server                   | MIT        |
| drizzle-orm  | ORM, query builder            | Apache-2.0 |
| drizzle-kit  | Sinh migration (dev)          | MIT        |
| mysql2       | Driver MySQL                  | MIT        |
| jszip 3.10 (dev) | Đọc .docx trong test | MIT hoặc GPL-3.0 (chọn MIT) |
| react        | Giao diện                     | MIT        |
| axios 1.21   | Gọi API phía client           | MIT        |
| @docx-editor.dev/react + core 2.33 | Editor DOCX trong trình duyệt (chỉ dùng bản core, không dùng tính năng Pro) | Apache-2.0 |
| tailwindcss 4.3 + @tailwindcss/vite | CSS cho giao diện (dev) | MIT |
| vite         | Dev server, build             | MIT        |

Chỉ dùng khi dựng mẫu (`npm run samples`), không cần để chạy app:

| Công cụ | Dùng cho | Giấy phép |
|---|---|---|
| python-docx | Sinh DOCX hợp đồng mẫu | MIT |
| python-pptx | Sinh 3 bộ PPTX mẫu | MIT |
| pypdfium2 | Render PDF → PNG | Apache-2.0 / BSD-3-Clause |
| Pillow | Ghi ảnh PNG | MIT-CMU |
| LibreOffice (headless) | DOCX / PPTX → PDF | MPL-2.0 |

## Lỗi thường gặp

- **`ECONNREFUSED 127.0.0.1:3306`**: MySQL chưa chạy. macOS + Homebrew: `brew services start mysql`.
- **`Access denied for user 'root'`**: tài khoản MySQL có mật khẩu; điền `DB_PASSWORD` trong `server/.env`.
- **`EADDRINUSE`**: cổng 3000 hoặc 5173 đang bị chiếm. Tắt tiến trình đang dùng cổng đó, hoặc đổi `PORT`.

## Ghi chú

Dự án có dùng AI (Claude Code) hỗ trợ lập trình.
