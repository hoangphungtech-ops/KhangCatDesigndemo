const fs = require("fs");
const path = require("path");

function loadEnv() {
  const file = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

loadEnv();

const csv = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const bool = (value, fallback = false) => {
  if (value == null || value === "") return fallback;
  return String(value).toLowerCase() === "true";
};

const env = (name) => String(process.env[name] || "").trim().replace(/^['"]|['"]$/g, "");

const requestedEmailProvider = env("EMAIL_PROVIDER").toLowerCase();
const resendKey = env("RESEND_API_KEY");
const emailProvider =
  resendKey && (!requestedEmailProvider || requestedEmailProvider === "smtp")
    ? "resend"
    : requestedEmailProvider || "smtp";

const config = {
  env: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3000),
  siteUrl: process.env.SITE_URL || "https://khangcatdesigndemo.com/",
  allowedOrigins: csv(
    process.env.ALLOWED_ORIGINS ||
      "https://khangcatdesigndemo.com,http://localhost:3000",
  ),
  adminEmails: csv(
    process.env.ADMIN_EMAILS ||
      "huukha.k.arc@gmail.com,hoangphung217205@gmail.com",
  ),
  adminApiKey: process.env.ADMIN_API_KEY || "",
  dbDriver: process.env.DB_DRIVER || "sqlite",
  databaseUrl: process.env.DATABASE_URL || "",
  sqliteFile:
    process.env.SQLITE_FILE || path.join(__dirname, "..", "data", "leads.db"),
  queueDriver: process.env.QUEUE_DRIVER || "inline",
  redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  emailProvider,
  emailFrom:
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM ||
    `KHANGCAT Design <${process.env.SMTP_USER || "no-reply@khangcatdesigndemo.com"}>`,
  replyTo: process.env.REPLY_TO || "huukha.k.arc@gmail.com",
  sendStatusEmails: bool(process.env.SEND_STATUS_EMAILS, true),
  smtp: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: bool(process.env.SMTP_SECURE, true),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
  postmarkToken: env("POSTMARK_SERVER_TOKEN"),
  sendgridKey: env("SENDGRID_API_KEY"),
  resendKey,
  crmWebhookUrl: process.env.CRM_WEBHOOK_URL || "",
  crmWebhookSecret: process.env.CRM_WEBHOOK_SECRET || "",
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || "",
  teamsWebhookUrl: process.env.TEAMS_WEBHOOK_URL || "",
  zaloWebhookUrl: process.env.ZALO_WEBHOOK_URL || "",
  zaloApiUrl: process.env.ZALO_API_URL || "",
  zaloAccessToken: process.env.ZALO_OA_ACCESS_TOKEN || "",
  zaloAdminUserId: process.env.ZALO_ADMIN_USER_ID || "",
  crmBaseUrl: process.env.CRM_BASE_URL || "",
  workerConcurrency: Number(process.env.WORKER_CONCURRENCY || 5),
  trustProxy: bool(process.env.TRUST_PROXY, false),
};

function emailConfigured() {
  if (config.emailProvider === "postmark") return Boolean(config.postmarkToken);
  if (config.emailProvider === "sendgrid") return Boolean(config.sendgridKey);
  if (config.emailProvider === "resend") {
    return (
      Boolean(config.resendKey) &&
      config.resendKey.startsWith("re_") &&
      !config.resendKey.includes("xxxxxxxx") &&
      !config.resendKey.includes(" ")
    );
  }
  if (config.emailProvider === "console") return true;
  return Boolean(
    config.smtp.user &&
      config.smtp.pass &&
      !config.smtp.pass.includes("NHAP_") &&
      !config.smtp.pass.includes("app_password"),
  );
}

module.exports = { config, emailConfigured };
