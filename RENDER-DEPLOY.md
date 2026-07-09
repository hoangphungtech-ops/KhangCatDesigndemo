# KHANGCAT Design - Render deploy

## Địa chỉ test thật

- Website: `https://khangcatdesigndemo.com/`
- Admin: `https://khangcatdesigndemo.com/admin`
- Client: `https://khangcatdesigndemo.com/client`

## Biến môi trường cần nhập trên Render

Không commit các giá trị này lên GitHub.

- `ADMIN_API_KEY`: chuỗi bí mật tối thiểu 32 ký tự.
- `SMTP_PASS`: Gmail App Password 16 ký tự của mail gửi.

Các biến còn lại đã được khai báo trong `render.yaml`.

## DNS domain

Sau khi tạo Web Service trên Render:

1. Vào Render service → Settings → Custom Domains.
2. Thêm `khangcatdesigndemo.com`.
3. Thêm tiếp `www.khangcatdesigndemo.com` nếu muốn dùng www.
4. Render sẽ hiện bản ghi DNS cần trỏ.
5. Vào nơi mua domain và cập nhật DNS theo Render.

## Lưu ý database demo

Cấu hình hiện tại dùng SQLite để dễ test nhanh trên Render. Nếu service deploy lại hoặc restart trên môi trường không có persistent disk, dữ liệu demo có thể mất.

Khi chạy thật cho sếp/khách dùng lâu dài, đổi sang PostgreSQL:

- `DB_DRIVER=postgres`
- `DATABASE_URL=<Render PostgreSQL Internal Database URL>`
- `DB_SSL=true`

