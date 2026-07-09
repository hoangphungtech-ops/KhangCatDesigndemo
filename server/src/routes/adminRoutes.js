const express = require("express");
const adminController = require("../controllers/adminController");
const { adminAuth } = require("../middleware/adminAuth");

const router = express.Router();
router.use(adminAuth);
router.get("/requests", adminController.list);
router.patch("/requests/:code/status", adminController.changeStatus);
router.patch("/requests/:code/assignment", adminController.assign);

module.exports = router;
