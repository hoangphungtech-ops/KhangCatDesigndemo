const { config } = require("./config");

const STATUS_LABELS = {
  new: "Mới tiếp nhận",
  contacted: "Đã liên hệ",
  survey: "Khảo sát",
  quoted: "Báo giá",
  design: "Thiết kế",
  construction: "Thi công",
  completed: "Hoàn thành",
};

const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );

function statusBar() {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:26px 0 30px;table-layout:fixed">
    <tr>
      <td align="center" width="18%"><span style="display:inline-block;width:38px;height:38px;line-height:38px;border-radius:50%;background:#1f7a43;color:#fff;font-size:20px;font-weight:bold">✓</span></td>
      <td width="23%"><div style="height:3px;background:#1f7a43"></div></td>
      <td align="center" width="18%"><span style="display:inline-block;width:38px;height:38px;line-height:38px;border-radius:50%;background:#49a568;color:#fff;font-weight:bold">•••</span></td>
      <td width="23%"><div style="height:3px;background:#dfe5e1"></div></td>
      <td align="center" width="18%"><span style="display:inline-block;width:34px;height:34px;line-height:34px;border:2px dashed #cbd5cf;border-radius:50%;color:#98a2a0;font-weight:bold">3</span></td>
    </tr>
    <tr>
      <td align="center" style="padding-top:9px;font-size:12px;font-weight:bold">Đã gửi yêu cầu</td><td></td>
      <td align="center" style="padding-top:9px;font-size:12px;font-weight:bold">Đang xử lý</td><td></td>
      <td align="center" style="padding-top:9px;color:#667085;font-size:12px;font-weight:bold">Hoàn thành</td>
    </tr>
  </table>`;
}

function row(label, value) {
  return `<tr><td style="padding:11px 12px;border-bottom:1px solid #e5e7eb;color:#667085;width:34%;vertical-align:top">${escapeHtml(label)}</td><td style="padding:11px 12px;border-bottom:1px solid #e5e7eb;color:#142033"><b>${escapeHtml(value || "—")}</b></td></tr>`;
}

function summary(lead) {
  const receivedAt = new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(lead.date));
  return [
    row("Mã hồ sơ", lead.code),
    row("Dự án", lead.project),
    row("Diện tích dự kiến", lead.area),
    row("Ngân sách dự kiến", lead.budget),
    row("Phong cách yêu cầu", lead.style),
    row("Họ tên", lead.name),
    row("Số điện thoại", lead.phone),
    row("Email", lead.email),
    row("Địa chỉ", lead.address),
    row("Nội dung", lead.message),
    row("File đính kèm", lead.file || "Không có"),
    row("Trạng thái", STATUS_LABELS[lead.status] || lead.status),
    row("Thời gian gửi", receivedAt),
  ].join("");
}

function shell({ eyebrow, title, intro, lead, actions = "" }) {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;background:#f3f6f4;font-family:Arial,Helvetica,sans-serif;color:#142033">
    <div style="display:none;max-height:0;overflow:hidden">${escapeHtml(title)} — ${escapeHtml(lead.code)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6f4"><tr><td align="center" style="padding:24px 12px">
      <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(20,32,51,.08)">
        <tr><td style="padding:28px 32px;background:#e8f8f2;border-bottom:1px solid #d8eee5">
          <table role="presentation" width="100%"><tr><td><span style="display:inline-block;background:#1f7a43;color:#fff;border-radius:9px;padding:10px 12px;font-size:13px;font-weight:800;line-height:1.05;text-align:center">KHANG<br>CAT</span></td><td align="right" style="color:#1f7a43;font-size:13px;font-weight:bold">KHANGCAT DESIGN</td></tr></table>
          <p style="margin:24px 0 6px;color:#1f7a43;font-size:12px;font-weight:bold;letter-spacing:1.4px">${escapeHtml(eyebrow)}</p>
          <h1 style="margin:0;font-size:30px;line-height:1.2">${escapeHtml(title)}</h1>
          <p style="margin:9px 0 0;color:#667085;font-size:13px">Mã hồ sơ: <b style="color:#142033">${escapeHtml(lead.code)}</b></p>
        </td></tr>
        <tr><td style="padding:30px 32px">${statusBar()}<div style="font-size:15px;line-height:1.7;color:#344054">${intro}</div>
          <h2 style="margin:28px 0 12px;color:#1f7a43;font-size:21px">Tóm tắt yêu cầu</h2>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #e5e7eb">${summary(lead)}</table>
          ${actions}
          <p style="margin:26px 0 0;padding-top:20px;border-top:1px solid #e5e7eb;color:#667085;font-size:12px;line-height:1.6;text-align:center">KHANGCAT Design · Giải pháp thiết kế tích hợp toàn diện<br>Vui lòng trả lời trực tiếp email này nếu cần bổ sung thông tin.</p>
        </td></tr>
      </table>
    </td></tr></table>
  </body></html>`;
}

function button(label, url, secondary = false) {
  if (!url) return "";
  const bg = secondary ? "#fff" : "#1f7a43";
  const color = secondary ? "#1f7a43" : "#fff";
  return `<a href="${escapeHtml(url)}" style="display:inline-block;margin:5px;padding:13px 20px;background:${bg};color:${color};border:1px solid #1f7a43;text-decoration:none;border-radius:9px;font-size:14px;font-weight:bold">${escapeHtml(label)}</a>`;
}

function textSummary(title, lead) {
  return `${title}\n\nMã hồ sơ: ${lead.code}\nDự án: ${lead.project}\nDiện tích: ${lead.area || "—"}\nNgân sách: ${lead.budget || "—"}\nPhong cách: ${lead.style || "—"}\nHọ tên: ${lead.name}\nSĐT: ${lead.phone}\nEmail: ${lead.email}\nĐịa chỉ: ${lead.address || "—"}\nNội dung: ${lead.message}\nFile: ${lead.file || "Không có"}\nTrạng thái: ${STATUS_LABELS[lead.status] || lead.status}`;
}

function adminEmail(lead) {
  const detailUrl = config.crmBaseUrl
    ? `${config.crmBaseUrl.replace(/\/$/, "")}/requests/${encodeURIComponent(lead.code)}`
    : `${config.siteUrl}?request=${encodeURIComponent(lead.code)}`;
  const actions = `<p style="text-align:center;margin:28px 0 6px">${button("Xem chi tiết trên CRM", detailUrl)}${button("Phân công Kiến trúc sư", detailUrl, true)}</p>`;
  return {
    subject: `🔔 KHANGCAT - Có khách hàng mới - ${lead.code}`,
    text: textSummary("Có yêu cầu thiết kế mới", lead),
    html: shell({
      eyebrow: "THÔNG BÁO LEAD MỚI",
      title: "Có khách hàng mới",
      intro: `<p style="margin:0"><b>Hệ thống vừa tiếp nhận một yêu cầu mới.</b> Nhấn Trả lời để liên hệ trực tiếp với ${escapeHtml(lead.name)} hoặc mở CRM để phân công xử lý.</p>`,
      lead,
      actions,
    }),
  };
}

function customerEmail(lead) {
  const detailUrl = `${config.siteUrl.replace(/\/$/, "")}/client`;
  return {
    subject: `KHANGCAT đã tiếp nhận yêu cầu - ${lead.code}`,
    text: textSummary("Yêu cầu của bạn đã được xác nhận", lead),
    html: shell({
      eyebrow: "XÁC NHẬN YÊU CẦU",
      title: "Đã xác nhận",
      intro: `<p style="margin:0 0 10px">Kính chào Anh/Chị <b>${escapeHtml(lead.name)}</b>,</p><p style="margin:0">Cảm ơn Quý khách đã gửi yêu cầu. Hồ sơ đã được ghi nhận và KHANGCAT Design sẽ liên hệ trong thời gian sớm nhất.</p>`,
      lead,
      actions: `<p style="text-align:center;margin:28px 0 6px">${button("Xem chi tiết yêu cầu", detailUrl)}</p>`,
    }),
  };
}

function statusEmail(lead) {
  const label = STATUS_LABELS[lead.status] || lead.status;
  const detailUrl = `${config.siteUrl.replace(/\/$/, "")}/client`;
  return {
    subject: `[KHANGCAT] Cập nhật yêu cầu #${lead.code} - ${label}`,
    text: `${textSummary("Trạng thái yêu cầu đã được cập nhật", lead)}\nTrạng thái mới: ${label}`,
    html: shell({
      eyebrow: "CẬP NHẬT TIẾN ĐỘ",
      title: label,
      intro: `<p style="margin:0">Xin chào <b>${escapeHtml(lead.name)}</b>, trạng thái yêu cầu <b>${escapeHtml(lead.code)}</b> đã được cập nhật thành <b>${escapeHtml(label)}</b>.</p>`,
      lead,
      actions: `<p style="text-align:center;margin:28px 0 6px">${button("Xem tiến độ yêu cầu", detailUrl)}</p>`,
    }),
  };
}

module.exports = { adminEmail, customerEmail, statusEmail, escapeHtml };
