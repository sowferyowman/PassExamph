const express = require("express");
const cors = require("cors");
const aiRoutes = require("./routes/aiRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const examRoutes = require("./routes/examRoutes");
const adminEssayRoutes = require("./routes/adminEssayRoutes");
const drillRoutes = require("./routes/drillRoutes");
const { resolveStudent } = require("./middleware/auth");
const { router: authRoutes } = require("./routes/authRoutes");
const dataRoutes = require("./routes/dataRoutes");

const app = express();

try { app.use(require("helmet")()); } catch (_error) { /* install helmet in production */ }

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json());
try { app.use(require("cookie-parser")()); } catch (_error) { /* auth middleware parses cookies directly */ }

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "acet-exam-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/data", resolveStudent, dataRoutes);

app.use("/api/dashboard", resolveStudent, dashboardRoutes);
app.use("/api/exams", resolveStudent, examRoutes);
app.use("/api/ai", resolveStudent, aiRoutes);
app.use("/api/admin", resolveStudent, adminEssayRoutes);
app.use("/api/drills", resolveStudent, drillRoutes);

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
});

module.exports = app;
