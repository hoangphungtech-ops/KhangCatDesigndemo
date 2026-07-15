const express = require("express");
const { rateLimit } = require("express-rate-limit");
const adminController = require("../controllers/adminController");
const { adminAuth } = require("../middleware/adminAuth");
const { config } = require("../config");

const router = express.Router();
const limiter = rateLimit({
  windowMs: 60_000,
  limit: config.adminRateLimitPerMinute,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Quá nhiều thao tác quản trị. Vui lòng thử lại sau." },
});
router.use(limiter);
router.use(adminAuth);
router.get("/requests", adminController.list);
router.patch("/requests/:code/status", adminController.changeStatus);
router.patch("/requests/:code/assignment", adminController.assign);

module.exports = router;
