$ErrorActionPreference = "Stop"
$Host.UI.RawUI.WindowTitle = "KHANGCAT - Cai dat email"

Write-Host ""
Write-Host "KHANGCAT DESIGN - CAI DAT GUI EMAIL" -ForegroundColor Green
Write-Host "App Password chi duoc luu trong file server/.env tren may nay." -ForegroundColor Yellow
Write-Host "Khong gui App Password qua chat va khong tai file .env len noi cong khai."
Write-Host ""

$defaultUser = "hoangphung217205@gmail.com"
$smtpUser = (Read-Host "Nhap Gmail dung de gui email (Enter de dung $defaultUser)").Trim()
if (-not $smtpUser) { $smtpUser = $defaultUser }
if ($smtpUser -notmatch "^[^@\s]+@gmail\.com$") {
  throw "Dia chi Gmail khong hop le."
}

$securePassword = Read-Host "Nhap Gmail App Password 16 ky tu" -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
  $smtpPass = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
}
$smtpPass = $smtpPass.Replace(" ", "").Trim()
if ($smtpPass.Length -ne 16) {
  throw "App Password phai gom 16 ky tu."
}

$envFile = Join-Path $PSScriptRoot ".env"
$adminApiKey = ([guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N"))
$content = @"
PORT=3000
SITE_URL=https://khangcatdesigndemo.com/
ALLOWED_ORIGINS=https://khangcatdesigndemo.com,http://localhost:3000
DB_DRIVER=sqlite
SQLITE_FILE=./data/leads.db
QUEUE_DRIVER=inline
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=$smtpUser
SMTP_PASS=$smtpPass
SMTP_FROM=KHANGCAT Design <$smtpUser>
EMAIL_FROM=KHANGCAT Design <$smtpUser>
REPLY_TO=huukha.k.arc@gmail.com
ADMIN_EMAILS=huukha.k.arc@gmail.com,hoangphung217205@gmail.com
ADMIN_API_KEY=$adminApiKey
"@
[IO.File]::WriteAllText($envFile, $content, [Text.UTF8Encoding]::new($false))
$smtpPass = $null

Write-Host ""
Write-Host "Da tao cau hinh email an toan." -ForegroundColor Green
Write-Host "Ma quan tri (hay sao chep va luu an toan):" -ForegroundColor Yellow
Write-Host $adminApiKey -ForegroundColor Cyan
Write-Host "Dang cai thu vien may chu..."
Push-Location $PSScriptRoot
try {
  npm.cmd install
  if ($LASTEXITCODE -ne 0) { throw "npm install khong thanh cong." }
  Write-Host ""
  Write-Host "May chu dang chay tai http://localhost:3000" -ForegroundColor Green
  Write-Host "Mo dia chi nay tren trinh duyet va gui mot yeu cau de test."
  Write-Host "Nhan Ctrl+C de dung may chu."
  npm.cmd start
} finally {
  Pop-Location
}
