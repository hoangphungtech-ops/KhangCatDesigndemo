const { z } = require("zod");
const { config } = require("../config");
const { sendEmail } = require("../email");
const leadService = require("../services/leadService");

const statusSchema = z.object({
  status: z.enum([
    "new",
    "contacted",
    "survey",
    "quoted",
    "design",
    "construction",
    "completed",
  ]),
});

const assignmentSchema = z.object({
  assignedTo: z.string().trim().max(120).optional().default(""),
  expectedDate: z.string().trim().max(20).optional().default(""),
});

async function list(req, res, next) {
  try {
    const rows = await leadService.listAdminLeads({
      limit: req.query.limit,
      status: req.query.status,
      assignedTo: req.query.assignedTo,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      search: req.query.search,
    });
    return res.json({ success: true, requests: rows });
  } catch (error) {
    return next(error);
  }
}

async function changeStatus(req, res, next) {
  try {
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: "Trạng thái không hợp lệ." });
    }
    const lead = await leadService.updateStatus(
      req.params.code,
      parsed.data.status,
      "admin",
    );
    if (!lead) return res.status(404).json({ success: false, message: "Không tìm thấy hồ sơ." });
    return res.json({
      success: true,
      request: lead,
      message: "Đã cập nhật Database và xếp lịch thông báo khách.",
    });
  } catch (error) {
    return next(error);
  }
}

async function assign(req, res, next) {
  try {
    const parsed = assignmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: "Thông tin phân công không hợp lệ." });
    }
    const lead = await leadService.updateAssignment(
      req.params.code,
      parsed.data.assignedTo,
      parsed.data.expectedDate,
      "admin",
    );
    if (!lead) return res.status(404).json({ success: false, message: "Không tìm thấy hồ sơ." });
    return res.json({ success: true, request: lead });
  } catch (error) {
    return next(error);
  }
}

async function outbox(req, res, next) {
  try {
    const jobs = await leadService.listOutboxJobs(req.query.limit);
    return res.json({
      success: true,
      jobs: jobs.map((job) => ({
        id: job.id,
        leadId: job.leadId,
        type: job.jobType,
        code: job.payload?.code || "",
        customer: job.payload?.name || "",
        phone: job.payload?.phone || "",
        email: job.payload?.email || "",
        project: job.payload?.project || "",
        status: job.status,
        attempts: job.attempts,
        lastError: job.lastError || "",
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      })),
    });
  } catch (error) {
    return next(error);
  }
}

async function testEmail(req, res) {
  try {
    const now = new Date().toISOString();
    const result = await sendEmail({
      to: config.adminEmails,
      replyTo: config.replyTo,
      tag: "admin-test",
      subject: `KHANGCAT test mail admin - ${now}`,
      text:
        `Day la email test tu KHANGCAT Design.\n` +
        `Provider: ${config.emailProvider}\n` +
        `Thoi gian: ${now}\n` +
        `Neu admin nhan duoc email nay, luong thong bao dang hoat dong.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden">
          <div style="background:#0f172a;color:white;padding:24px">
            <p style="margin:0;color:#86efac;font-weight:700;letter-spacing:.12em">KHANGCAT DESIGN</p>
            <h2 style="margin:10px 0 0">Test mail admin thành công</h2>
          </div>
          <div style="padding:24px;color:#111827;line-height:1.7">
            <p>Đây là email kiểm tra từ hệ thống KHANGCAT Design.</p>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px;border-bottom:1px solid #eee">Provider</td><td style="padding:8px;border-bottom:1px solid #eee"><b>${config.emailProvider}</b></td></tr>
              <tr><td style="padding:8px;border-bottom:1px solid #eee">Thời gian</td><td style="padding:8px;border-bottom:1px solid #eee">${now}</td></tr>
              <tr><td style="padding:8px;border-bottom:1px solid #eee">Admin</td><td style="padding:8px;border-bottom:1px solid #eee">${config.adminEmails.join(", ")}</td></tr>
            </table>
            <p style="margin-top:18px">Nếu admin nhận được email này, luồng thông báo đang hoạt động.</p>
          </div>
        </div>
      `,
    });
    return res.json({ success: true, provider: config.emailProvider, result });
  } catch (error) {
    return res.status(502).json({
      success: false,
      provider: config.emailProvider,
      message: error.message,
    });
  }
}

module.exports = { list, changeStatus, assign, outbox, testEmail };
