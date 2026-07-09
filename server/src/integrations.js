const { createHmac } = require("crypto");
const { config } = require("./config");

async function postJson(url, payload, headers = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Webhook ${response.status}: ${(await response.text()).slice(0, 300)}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function pushCrm(lead) {
  if (!config.crmWebhookUrl) return { skipped: true };
  const payload = {
    event: "lead.created",
    occurredAt: new Date().toISOString(),
    data: lead,
  };
  const raw = JSON.stringify(payload);
  const headers = config.crmWebhookSecret
    ? {
        "X-KHANGCAT-Signature": createHmac("sha256", config.crmWebhookSecret)
          .update(raw)
          .digest("hex"),
      }
    : {};
  await postJson(config.crmWebhookUrl, payload, headers);
  return { delivered: true };
}

async function notifySlack(lead) {
  if (!config.slackWebhookUrl) return { skipped: true };
  const detailUrl = config.crmBaseUrl
    ? `${config.crmBaseUrl.replace(/\/$/, "")}/requests/${encodeURIComponent(lead.code)}`
    : config.siteUrl;
  await postJson(config.slackWebhookUrl, {
    text: `Yêu cầu thiết kế mới #${lead.code}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: `🏠 Yêu cầu thiết kế mới #${lead.code}` },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Khách hàng*\n${lead.name}` },
          { type: "mrkdwn", text: `*Điện thoại*\n${lead.phone}` },
          { type: "mrkdwn", text: `*Dự án*\n${lead.project}` },
          { type: "mrkdwn", text: `*Email*\n${lead.email}` },
        ],
      },
      { type: "section", text: { type: "mrkdwn", text: `*Yêu cầu*\n${lead.message}` } },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Xem trên CRM" },
            url: detailUrl,
            style: "primary",
          },
        ],
      },
    ],
  });
  return { delivered: true };
}

async function notifyTeams(lead) {
  if (!config.teamsWebhookUrl) return { skipped: true };
  await postJson(config.teamsWebhookUrl, {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.4",
          body: [
            { type: "TextBlock", text: `Yêu cầu thiết kế mới #${lead.code}`, weight: "Bolder", size: "Large" },
            {
              type: "FactSet",
              facts: [
                { title: "Khách hàng", value: lead.name },
                { title: "Điện thoại", value: lead.phone },
                { title: "Email", value: lead.email },
                { title: "Dự án", value: lead.project },
              ],
            },
            { type: "TextBlock", text: lead.message, wrap: true },
          ],
        },
      },
    ],
  });
  return { delivered: true };
}

async function notifyZalo(lead) {
  const dashboardUrl = `${config.siteUrl.replace(/\/$/, "")}/admin?code=${encodeURIComponent(lead.code)}`;
  const text = [
    "🔔 CÓ KHÁCH HÀNG MỚI",
    `Mã hồ sơ: ${lead.code}`,
    `Tên: ${lead.name}`,
    `SĐT: ${lead.phone}`,
    `Email: ${lead.email}`,
    `Dự án: ${lead.project}`,
    `Nội dung: ${lead.message}`,
    `Dashboard: ${dashboardUrl}`,
  ].join("\n");

  if (config.zaloWebhookUrl) {
    await postJson(config.zaloWebhookUrl, {
      event: "lead.created",
      text,
      dashboardUrl,
      lead,
    });
    return { delivered: true, channel: "webhook" };
  }

  if (
    config.zaloApiUrl &&
    config.zaloAccessToken &&
    config.zaloAdminUserId
  ) {
    await postJson(
      config.zaloApiUrl,
      {
        recipient: { user_id: config.zaloAdminUserId },
        message: { text },
      },
      { access_token: config.zaloAccessToken },
    );
    return { delivered: true, channel: "zalo-oa" };
  }

  return { skipped: true };
}

async function notifyIntegrations(lead) {
  const results = await Promise.allSettled([
    pushCrm(lead),
    notifyZalo(lead),
    notifySlack(lead),
    notifyTeams(lead),
  ]);
  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length) {
    throw new Error(
      failures.map((result) => result.reason?.message || "Webhook lỗi").join(" | "),
    );
  }
  return results.map((result) => result.value);
}

module.exports = {
  pushCrm,
  notifyZalo,
  notifySlack,
  notifyTeams,
  notifyIntegrations,
};
