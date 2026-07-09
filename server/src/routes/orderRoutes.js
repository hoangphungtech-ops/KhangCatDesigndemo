const express = require("express");
const { rateLimit } = require("express-rate-limit");
const orderController = require("../controllers/orderController");

const router = express.Router();
const limiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Bạn gửi quá nhanh. Vui lòng thử lại sau một phút." },
});

router.post("/", limiter, orderController.create);

module.exports = router;
