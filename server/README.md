# KHANGCAT Lead Platform 2.0

Backend tiếp nhận yêu cầu thiết kế theo mô hình production:

1. Lưu lead và các job thông báo vào database trong cùng transaction.
2. Trả HTTP `202 Accepted` ngay sau khi dữ liệu được ghi an toàn.
3. Worker gửi email admin trước; chỉ khi thành công mới mở khóa email xác nhận khách.
4. CRM, Zalo, Slack và Teams chạy độc lập; job lỗi được retry mà không gửi lặp kênh đã hoàn tất.
5. Admin đổi trạng thái sẽ tạo email cập nhật tiến độ cho khách.

## Kiến trúc mã nguồn

```text
src/routes       → khai báo endpoint
src/controllers  → kiểm tra request/response
src/services     → nghiệp vụ CRM
src/models       → giao tiếp tầng dữ liệu
src/db.js        → adapter SQLite/PostgreSQL
src/queue.js     → inline queue hoặc Redis/BullMQ
```

Mã hồ sơ được Database sinh tuần tự theo ngày: `KC-YYYYMMDD-0001`. Bảng `lead_events` ghi lịch sử tiếp nhận, phân công và thay đổi trạng thái; `outbox_jobs` ghi thời gian/trạng thái gửi từng kênh thông báo.

Trạng thái chuẩn:

```text
Mới tiếp nhận → Đã liên hệ → Khảo sát → Báo giá → Thiết kế → Thi công → Hoàn thành
```

## Chạy nhanh trên Windows

1. Bật xác minh hai bước cho Gmail gửi và tạo App Password 16 ký tự.
2. Nhấp đúp `CAI-DAT-EMAIL.cmd`.
3. Nhập Gmail và App Password trong cửa sổ máy tính.
4. Mở `http://localhost:3000` để gửi yêu cầu thử.

Chế độ này dùng SQLite + hàng đợi xử lý nền trong tiến trình và SMTP Gmail, phù hợp demo nội bộ.

## Kiểm tra hệ thống

- `GET /api/health`: trạng thái cấu hình nhanh.
- `GET /api/health?deep=1`: kiểm tra kết nối email thật.
- `POST /api/orders`: nhận lead, trả `202` sau khi ghi database.
- `GET /api/client/requests?phone=...`: khách tra hồ sơ bằng số điện thoại.
- `GET /client`: Client Portal, đăng nhập bằng số điện thoại.
- `GET /api/admin/requests`: danh sách lead, yêu cầu Bearer `ADMIN_API_KEY`.
- `PATCH /api/admin/requests/:code/status`: cập nhật `new`, `contacted`, `survey`, `quoted`, `design`, `construction`, `completed` và gửi email khách nếu `SEND_STATUS_EMAILS=true`.
- `PATCH /api/admin/requests/:code/assignment`: phân công nhân viên và ngày dự kiến.

Dashboard hỗ trợ lọc theo ngày, trạng thái, nhân viên; tự làm mới mỗi 15 giây. Email khách chứa liên kết trực tiếp tới Client Portal. Portal hiển thị dự án, trạng thái, phần trăm tiến độ, người phụ trách, ngày dự kiến và khu vực dành cho báo giá, hợp đồng, PDF, ảnh/video tiến độ.

## Production

Production sử dụng:

- PostgreSQL: dữ liệu lead và transactional outbox.
- Redis + BullMQ: worker riêng, concurrency và exponential retry.
- Postmark hoặc SendGrid: email giao dịch có xác thực tên miền.
- CRM webhook có chữ ký HMAC SHA-256.
- Slack/Microsoft Teams webhook: thông báo real-time.
- Helmet, CORS allowlist, rate limit và Zod validation.

Xem [PRODUCTION.md](PRODUCTION.md) để cấu hình DNS và triển khai.

## Các biến quan trọng

Sao chép `.env.example` thành `.env`. Không đưa `.env` vào ZIP công khai hoặc Git.

```env
EMAIL_PROVIDER=postmark
POSTMARK_SERVER_TOKEN=...
EMAIL_FROM=KHANGCAT Design <no-reply@khangcatdesigndemo.com>
ADMIN_EMAILS=huukha.k.arc@gmail.com,hoangphung217205@gmail.com
DB_DRIVER=postgres
DATABASE_URL=postgresql://...
QUEUE_DRIVER=redis
REDIS_URL=redis://...
CRM_WEBHOOK_URL=https://...
SLACK_WEBHOOK_URL=https://...
TEAMS_WEBHOOK_URL=https://...
ZALO_WEBHOOK_URL=https://...
```

## Lệnh

```powershell
npm.cmd install
npm.cmd start   # API + web
npm.cmd run worker
```

Với Docker, chạy `docker compose up -d --build` tại thư mục `khangcat-demo`.

Triển khai VPS 24/7 bằng Nginx + PM2 xem [`../deploy/README.md`](../deploy/README.md).
