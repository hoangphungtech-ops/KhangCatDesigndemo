# Triển khai KHANGCAT 24/7 trên VPS

Mô hình:

```text
Internet → HTTPS/Nginx → Node.js API (PM2 cluster)
                         ├─ PostgreSQL
                         └─ Redis/BullMQ → PM2 Worker → Email/CRM/Slack/Teams
```

## Yêu cầu VPS

- Ubuntu LTS, tối thiểu 2 vCPU và 4 GB RAM cho giai đoạn đầu.
- Node.js tương thích với `package.json`, Nginx, PostgreSQL, Redis và PM2.
- DNS A record của `khangcatdesigndemo.com` trỏ tới IP VPS.
- Chỉ mở cổng 22, 80 và 443; PostgreSQL/Redis không public ra Internet.

## 1. Chuẩn bị thư mục

```bash
sudo mkdir -p /var/www/khangcat /var/log/khangcat
sudo chown -R "$USER":"$USER" /var/www/khangcat /var/log/khangcat
```

Tải nội dung `khangcat-demo` vào `/var/www/khangcat`.

## 2. Cấu hình production

```bash
cd /var/www/khangcat/server
cp .env.example .env
nano .env
```

Tối thiểu phải cấu hình:

```env
NODE_ENV=production
SITE_URL=https://khangcatdesigndemo.com/
ALLOWED_ORIGINS=https://khangcatdesigndemo.com,https://www.khangcatdesigndemo.com
TRUST_PROXY=true
DB_DRIVER=postgres
DATABASE_URL=postgresql://...
QUEUE_DRIVER=redis
REDIS_URL=redis://127.0.0.1:6379
EMAIL_PROVIDER=postmark
POSTMARK_SERVER_TOKEN=...
EMAIL_FROM=KHANGCAT Design <no-reply@khangcatdesigndemo.com>
ADMIN_API_KEY=chuoi-ngau-nhien-toi-thieu-64-ky-tu
```

Đặt quyền bảo vệ:

```bash
chmod 600 /var/www/khangcat/server/.env
```

## 3. PM2

```bash
sudo npm install -g pm2
cd /var/www/khangcat
bash deploy/deploy.sh
pm2 startup systemd
```

Chạy lệnh do `pm2 startup` in ra, sau đó:

```bash
pm2 save
pm2 status
```

PM2 sẽ tự khởi động lại web/worker khi lỗi hoặc VPS reboot.

## 4. Nginx và SSL

Lần cấp chứng chỉ đầu tiên, cài cấu hình HTTP tạm:

```bash
sudo cp /var/www/khangcat/deploy/nginx-bootstrap.conf /etc/nginx/sites-available/khangcat
sudo ln -s /etc/nginx/sites-available/khangcat /etc/nginx/sites-enabled/khangcat
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d khangcatdesigndemo.com -d www.khangcatdesigndemo.com
```

Sau khi chứng chỉ đã tồn tại, chuyển sang cấu hình production:

```bash
sudo cp /var/www/khangcat/deploy/nginx-khangcat.conf /etc/nginx/sites-available/khangcat
sudo nginx -t
sudo systemctl reload nginx
```

## 5. Địa chỉ sử dụng

- Website: `https://khangcatdesigndemo.com/`
- Client Portal: `https://khangcatdesigndemo.com/client`
- Admin Dashboard: `https://khangcatdesigndemo.com/admin`
- Health check: `https://khangcatdesigndemo.com/api/health?deep=1`

## 6. Vận hành

```bash
pm2 status
pm2 logs khangcat-web
pm2 logs khangcat-worker
bash /var/www/khangcat/deploy/health-check.sh
```

Thêm cron backup PostgreSQL hằng ngày và lưu thêm một bản ngoài VPS:

```cron
15 2 * * * /var/www/khangcat/deploy/backup-postgres.sh >> /var/log/khangcat/backup.log 2>&1
```

Muốn website thực sự chạy 24/7, các bước này phải được thực hiện trên VPS/cloud. Laptop tắt không ảnh hưởng VPS.
