const { z } = require("zod");
const leadService = require("../services/leadService");

const leadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(24),
  email: z.string().trim().email().max(160),
  address: z.string().trim().max(300).optional().default(""),
  projectCode: z.string().trim().max(50).optional().default(""),
  project: z.string().trim().min(2).max(180),
  message: z.string().trim().min(5).max(5_000),
  file: z.string().trim().max(255).optional().default(""),
  date: z.string().datetime().optional(),
  source: z.string().trim().max(50).optional().default("website"),
  area: z.string().trim().max(80).optional().default(""),
  budget: z.string().trim().max(120).optional().default(""),
  style: z.string().trim().max(120).optional().default(""),
});

async function create(req, res, next) {
  try {
    const parsed = leadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Thông tin yêu cầu chưa hợp lệ.",
        fields: parsed.error.flatten().fieldErrors,
      });
    }
    const result = await leadService.createLead(parsed.data);
    return res.status(202).json({
      success: true,
      queued: true,
      code: result.lead.code,
      status: result.lead.status,
      message: "Yêu cầu đã được lưu và đang gửi thông báo.",
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { create };
