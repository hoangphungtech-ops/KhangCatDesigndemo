const express = require("express");
const { rateLimit } = require("express-rate-limit");
const clientController = require("../controllers/clientController");

const router = express.Router();
const limiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

router.get("/requests", limiter, clientController.listByPhone);

module.exports = router;
