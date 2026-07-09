const { config } = require("./config");
const { sendEmail } = require("./email");
const { adminEmail, customerEmail, statusEmail } = require("./templates");
const {
  pushCrm,
  notifyZalo,
  notifySlack,
  notifyTeams,
} = require("./integrations");

async function processJob(type, lead) {
  if (type === "email.admin") {
    const template = adminEmail(lead);
    return sendEmail({
      ...template,
      to: config.adminEmails,
      replyTo: lead.email,
      tag: "lead-admin",
    });
  }
  if (type === "email.customer") {
    const template = customerEmail(lead);
    return sendEmail({
      ...template,
      to: lead.email,
      replyTo: config.replyTo,
      tag: "lead-customer",
    });
  }
  if (type.startsWith("email.status.")) {
    if (!config.sendStatusEmails) return { skipped: true };
    const template = statusEmail(lead);
    return sendEmail({
      ...template,
      to: lead.email,
      replyTo: config.replyTo,
      tag: "lead-status",
    });
  }
  if (type === "crm.push") return pushCrm(lead);
  if (type === "zalo.notify") return notifyZalo(lead);
  if (type === "slack.notify") return notifySlack(lead);
  if (type === "teams.notify") return notifyTeams(lead);
  throw new Error(`Không hỗ trợ job type: ${type}`);
}

module.exports = { processJob };
