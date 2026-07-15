const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
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
  app.disable("x-powered-by");

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      hsts: config.env === "production" ? { maxAge: 31_536_000, includeSubDomains: true } : false,
    }),
  );

  app.use((req, res, next) => {
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (req.path.startsWith("/api/")) {
      res.setHeader("Cache-Control", "no-store");
    }
    next();
  });

  app.use(
    "/api",
    rateLimit({
      windowMs: 60_000,
      limit: config.publicRateLimitPerMinute,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: {
        success: false,
        message: "Hệ thống đang nhận quá nhiều yêu cầu. Vui lòng thử lại sau.",
      },
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || config.allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        const error = new Error("Origin không được phép.");
        error.status = 403;
        return callback(error);
      },
    }),
  );

  app.use(express.json({ limit: "1mb", type: "application/json" }));

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
    return res.status(error.status || 500).json({
      success: false,
      message:
        error.status === 403
          ? "Nguồn truy cập không được phép."
          : "Hệ thống đang bận. Yêu cầu chưa được ghi nhận, vui lòng thử lại.",
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
