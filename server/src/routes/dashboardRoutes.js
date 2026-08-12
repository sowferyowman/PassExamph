const router = require("express").Router();
const { getDashboardSummary } = require("../services/dashboardService");

router.get("/", async (req, res) => {
  try {
    const summary = await getDashboardSummary(req.user.id);
    res.json(summary);
  } catch (error) {
    console.error("Dashboard Service execution failure:", error);
    res.status(500).json({ error: "Failed to construct application metrics context." });
  }
});

module.exports = router;
