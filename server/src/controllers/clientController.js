const leadService = require("../services/leadService");

async function listByPhone(req, res, next) {
  try {
    const phone = String(req.query.phone || "").replace(/\D/g, "").replace(/^84/, "0");
    if (phone.length < 8 || phone.length > 16) {
      return res.status(400).json({
        success: false,
        message: "Số điện thoại không hợp lệ.",
      });
    }

    const requests = await leadService.findClientRequests(phone);
    if (!requests.length) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy hồ sơ.",
      });
    }

    return res.json({ success: true, requests });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listByPhone };
