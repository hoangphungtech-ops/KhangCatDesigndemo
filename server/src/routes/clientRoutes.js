const express = require("express");
const { rateLimit } = require("express-rate-limit");
const clientController = require("../controllers/clientController");
const { config } = require("../config");

const router = express.Router();
const limiter = rateLimit({
  windowMs: 60_000,
  limit: config.clientRateLimitPerMinute,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Bạn tra cứu quá nhanh. Vui lòng thử lại sau một phút.",
  },
});

router.get("/requests", limiter, clientController.listByPhone);

module.exports = router;
