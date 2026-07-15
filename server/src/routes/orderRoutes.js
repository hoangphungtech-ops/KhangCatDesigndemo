const express = require("express");
const { rateLimit } = require("express-rate-limit");
const orderController = require("../controllers/orderController");
const { config } = require("../config");

const router = express.Router();
const limiter = rateLimit({
  windowMs: 60_000,
  limit: config.orderRateLimitPerMinute,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Bạn gửi yêu cầu quá nhanh. Vui lòng thử lại sau một phút.",
  },
});

router.post("/", limiter, orderController.create);

module.exports = router;
