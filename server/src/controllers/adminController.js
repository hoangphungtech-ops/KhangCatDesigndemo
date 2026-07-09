const { z } = require("zod");
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

module.exports = { list, changeStatus, assign };
