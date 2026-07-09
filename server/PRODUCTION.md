# Triển khai production và xác thực tên miền

## 1. Hạ tầng khuyến nghị

- Web/API: 2 instance Node.js sau reverse proxy HTTPS.
- Worker: tối thiểu 1 instance riêng.
- Database: PostgreSQL có backup tự động và point-in-time recovery.
- Queue: Redis có persistence, mật khẩu và private network.
- Email: Postmark, Amazon SES hoặc SendGrid; không dùng Gmail cá nhân.

File `docker-compose.yml` là cấu hình khởi đầu cho một máy chủ. Hệ thống lớn nên dùng database/Redis managed.

## 2. Cấu hình email giao dịch

### Postmark

```env
EMAIL_PROVIDER=postmark
POSTMARK_SERVER_TOKEN=pm-...
EMAIL_FROM=KHANGCAT Design <no-reply@khangcatdesigndemo.com>
REPLY_TO=huukha.k.arc@gmail.com
```

### SendGrid

```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG...
EMAIL_FROM=KHANGCAT Design <no-reply@khangcatdesigndemo.com>
```

## 3. DNS SPF, DKIM và DMARC

Lấy chính xác bản ghi SPF/DKIM từ nhà cung cấp email đã chọn rồi thêm tại DNS của `khangcatdesigndemo.com`.

DMARC nên triển khai theo ba giai đoạn:

```dns
_dmarc.khangcatdesigndemo.com TXT "v=DMARC1; p=none; rua=mailto:dmarc@khangcatdesigndemo.com; adkim=s; aspf=s"
```

Sau khi theo dõi báo cáo và xác nhận mọi nguồn gửi hợp lệ, chuyển `p=none` sang `p=quarantine`, cuối cùng là `p=reject`.

Không thể cam kết 100% vào Inbox: SPF/DKIM/DMARC, danh tiếng tên miền, nội dung và hành vi người nhận đều ảnh hưởng khả năng phân phối.

## 4. Webhook CRM và thông báo đội ngũ

```env
CRM_WEBHOOK_URL=https://crm.example.com/webhooks/khangcat
CRM_WEBHOOK_SECRET=chuoi-bi-mat-dai-ngau-nhien
CRM_BASE_URL=https://crm.example.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
TEAMS_WEBHOOK_URL=https://...
```

## 4.1 Thông báo Zalo

Phương án dễ vận hành nhất là dùng một webhook bridge trên n8n/Make để nhận payload từ KHANGCAT và gửi qua Zalo OA:

```env
ZALO_WEBHOOK_URL=https://automation.example.com/webhook/khangcat-zalo
```

Nếu tích hợp trực tiếp Zalo OA, cấu hình endpoint đúng theo ứng dụng/OA đã được Zalo phê duyệt:

```env
ZALO_API_URL=https://openapi.zalo.me/...
ZALO_OA_ACCESS_TOKEN=...
ZALO_ADMIN_USER_ID=...
```

Không ghi access token vào mã nguồn. Tài khoản admin phải có Zalo user ID hợp lệ trong phạm vi OA cho phép tương tác. Thông báo chứa đường dẫn `/admin?code=...` để mở Dashboard và bấm **Tiếp nhận**.

CRM nhận header `X-KHANGCAT-Signature`, là HMAC SHA-256 của JSON payload. CRM phải xác minh chữ ký trước khi xử lý.

## 5. Vận hành

- Bật HTTPS và `TRUST_PROXY=true` sau reverse proxy.
- Chỉ cho phép domain thật trong `ALLOWED_ORIGINS`.
- Không công khai PostgreSQL/Redis ra Internet.
- Theo dõi hàng đợi failed, tỷ lệ gửi email và thời gian phản hồi lead.
- Backup PostgreSQL hằng ngày; thử phục hồi định kỳ.
- Luân chuyển API token, webhook secret và mật khẩu database.
- Thiết lập cảnh báo khi `/api/health?deep=1` thất bại.
