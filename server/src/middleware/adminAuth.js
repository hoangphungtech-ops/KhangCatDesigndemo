const { timingSafeEqual } = require("crypto");
const { config } = require("../config");

function adminAuth(req, res, next) {
  if (!config.adminApiKey) {
    return res.status(503).json({
      success: false,
      message: "ADMIN_API_KEY chưa được cấu hình.",
    });
  }

  if (config.env === "production" && config.adminApiKey.length < 32) {
    return res.status(503).json({
      success: false,
      message: "ADMIN_API_KEY quá ngắn. Vui lòng dùng khóa quản trị tối thiểu 32 ký tự.",
    });
  }

  const supplied = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const expected = Buffer.from(config.adminApiKey);
  const actual = Buffer.from(supplied);

  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return res.status(401).json({
      success: false,
      message: "Không có quyền quản trị.",
    });
  }

  return next();
}

module.exports = { adminAuth };
