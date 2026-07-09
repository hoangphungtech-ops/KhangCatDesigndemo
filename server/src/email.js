const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const { config, emailConfigured } = require("./config");

let smtpTransport;

function fromParts(value) {
  const match = String(value).match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return match
    ? { name: match[1] || "KHANGCAT Design", email: match[2] }
    : { name: "KHANGCAT Design", email: String(value).trim() };
}

async function postmark(message) {
  const response = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": config.postmarkToken,
    },
    body: JSON.stringify({
      From: config.emailFrom,
      To: Array.isArray(message.to) ? message.to.join(",") : message.to,
      ReplyTo: message.replyTo,
      Subject: message.subject,
      HtmlBody: message.html,
      TextBody: message.text,
      MessageStream: "outbound",
      Tag: message.tag || "lead-notification",
    }),
  });
  if (!response.ok) throw new Error(`Postmark ${response.status}: ${await response.text()}`);
  return response.json();
}

async function sendgrid(message) {
  const sender = fromParts(config.emailFrom);
  const recipients = (Array.isArray(message.to) ? message.to : [message.to]).map(
    (email) => ({ email }),
  );
  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.sendgridKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: recipients }],
      from: sender,
      reply_to: message.replyTo ? { email: message.replyTo } : undefined,
      subject: message.subject,
      content: [
        { type: "text/plain", value: message.text },
        { type: "text/html", value: message.html },
      ],
      categories: [message.tag || "lead-notification"],
    }),
  });
  if (!response.ok) throw new Error(`SendGrid ${response.status}: ${await response.text()}`);
  return { messageId: response.headers.get("x-message-id") };
}

async function smtp(message) {
  if (!smtpTransport) {
    smtpTransport = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
    });
  }
  return smtpTransport.sendMail({
    from: config.emailFrom,
    to: message.to,
    replyTo: message.replyTo,
    subject: message.subject,
    text: message.text,
    html: message.html,
    headers: { "X-KHANGCAT-Event": message.tag || "lead-notification" },
  });
}

async function consoleEmail(message) {
  const dir = path.join(__dirname, "..", "data", "email-previews");
  fs.mkdirSync(dir, { recursive: true });
  const safe = `${Date.now()}-${message.tag || "email"}`.replace(/[^a-z0-9-]/gi, "-");
  fs.writeFileSync(path.join(dir, `${safe}.html`), message.html, "utf8");
  console.log(`[email:console] ${message.subject} -> ${message.to}`);
  return { messageId: safe };
}

async function sendEmail(message) {
  if (!emailConfigured()) {
    throw new Error(`Email provider '${config.emailProvider}' chưa được cấu hình.`);
  }
  if (config.emailProvider === "postmark") return postmark(message);
  if (config.emailProvider === "sendgrid") return sendgrid(message);
  if (config.emailProvider === "console") return consoleEmail(message);
  return smtp(message);
}

async function verifyEmailProvider() {
  if (!emailConfigured()) return false;
  if (config.emailProvider !== "smtp") return true;
  if (!smtpTransport) {
    smtpTransport = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    });
  }
  await smtpTransport.verify();
  return true;
}

module.exports = { sendEmail, verifyEmailProvider };
