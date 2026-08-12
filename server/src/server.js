const express = require("express");
const cors = require("cors");
const aiRoutes = require("./routes/aiRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const examRoutes = require("./routes/examRoutes");
const adminEssayRoutes = require("./routes/adminEssayRoutes");
const drillRoutes = require("./routes/drillRoutes");
const { resolveStudent, authenticate } = require("./middleware/auth");
const { router: authRoutes } = require("./routes/authRoutes");
const dataRoutes = require("./routes/dataRoutes");
const contentRoutes = require("./routes/contentRoutes");

const app = express();
const allowedOrigins = String(process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

try { app.use(require("helmet")()); } catch (_error) { /* install helmet in production */ }

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS."));
  },
  credentials: true
}));
// Reviewer lessons contain rich-text HTML and can legitimately exceed Express's
// small default JSON limit. Keep a bounded limit rather than rejecting lessons.
app.use(express.json({ limit: "10mb" }));
try { app.use(require("cookie-parser")()); } catch (_error) { /* auth middleware parses cookies directly */ }

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "acet-exam-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/data", resolveStudent, dataRoutes);
app.use("/api/content", authenticate, contentRoutes);

app.use("/api/dashboard", resolveStudent, dashboardRoutes);
app.use("/api/exams", resolveStudent, examRoutes);
app.use("/api/ai", resolveStudent, aiRoutes);
app.use("/api/admin", resolveStudent, adminEssayRoutes);
app.use("/api/drills", resolveStudent, drillRoutes);

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
});

module.exports = app;
