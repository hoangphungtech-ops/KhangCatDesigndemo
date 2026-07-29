const { z } = require("zod");
const leadService = require("../services/leadService");

const cleanText = (value) =>
  String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const textField = (min, max) =>
  z.preprocess((value) => cleanText(value), z.string().min(min).max(max));

const optionalTextField = (max) =>
  z.preprocess((value) => cleanText(value), z.string().max(max).optional().default(""));

const phoneField = z.preprocess(
  (value) => String(value ?? "").replace(/\D/g, "").replace(/^84/, "0"),
  z.string().min(8).max(16),
);

const leadSchema = z.object({
  name: textField(2, 120),
  phone: phoneField,
  email: z.preprocess(
    (value) => cleanText(value).toLowerCase(),
    z.string().email().max(160),
  ),
  address: optionalTextField(300),
  projectCode: optionalTextField(50),
  project: textField(2, 180),
  message: textField(5, 5_000),
  file: optionalTextField(255),
  date: z.string().datetime().optional(),
  source: optionalTextField(50),
  area: optionalTextField(80),
  budget: optionalTextField(120),
  style: optionalTextField(120),
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

    const result = await leadService.createLead({
      ...parsed.data,
      source: parsed.data.source || "website",
    });

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
