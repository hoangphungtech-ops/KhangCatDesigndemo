const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { config, emailConfigured } = require("./config");
const { initDatabase, closeDatabase } = require("./db");
const { startDispatcher, stopQueue } = require("./queue");
const { verifyEmailProvider } = require("./email");
const orderRoutes = require("./routes/orderRoutes");
const adminRoutes = require("./routes/adminRoutes");
const clientRoutes = require("./routes/clientRoutes");

async function createApp() {
  await initDatabase();
  const app = express();
  if (config.trustProxy) app.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || config.allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error("Origin không được phép."));
      },
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", async (req, res) => {
    let emailVerified = null;
    if (req.query.deep === "1") {
      try {
        emailVerified = await verifyEmailProvider();
      } catch {
        emailVerified = false;
      }
    }
    res.json({
      success: true,
      service: "khangcat-lead-platform",
      architecture: "routes-controllers-services-models",
      database: config.dbDriver,
      queue: config.queueDriver,
      emailProvider: config.emailProvider,
      emailConfigured: emailConfigured(),
      emailVerified,
      adminRecipients: config.adminEmails.length,
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api/orders", orderRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/client", clientRoutes);

  app.use("/server", (req, res) => res.sendStatus(404));
  app.get(["/client", "/admin"], (req, res) =>
    res.sendFile(path.join(__dirname, "..", "..", "index.html")),
  );
  app.use(express.static(path.join(__dirname, "..", ".."), { dotfiles: "deny" }));

  app.use((error, req, res, next) => {
    console.error(`[${req.method} ${req.path}]`, error.message);
    if (res.headersSent) return next(error);
    return res.status(500).json({
      success: false,
      message: "Hệ thống đang bận. Yêu cầu chưa được ghi nhận, vui lòng thử lại.",
    });
  });

  startDispatcher();
  return app;
}

async function shutdown() {
  await stopQueue();
  await closeDatabase();
}

module.exports = { createApp, shutdown };
