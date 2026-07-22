const router = require("express").Router();
const { buildAdaptiveGate, diagnoseExam, scoreEssay } = require("../services/aiService");

router.post("/diagnose-exam", async (req, res) => {
  try {
    const diagnosis = await diagnoseExam({
      studentId: req.user?.id,
      ...req.body
    });
    res.json(diagnosis);
  } catch (error) {
    console.error("AI diagnose endpoint failure:", error);
    res.status(500).json({ error: "Failed to generate exam diagnosis." });
  }
});

router.post("/adaptive-gate", async (req, res) => {
  try {
    const gate = await buildAdaptiveGate({
      studentId: req.user?.id,
      ...req.body
    });
    res.json(gate);
  } catch (error) {
    console.error("AI adaptive gate endpoint failure:", error);
    res.status(500).json({ error: "Failed to generate adaptive learning gate." });
  }
});

router.post("/score-essay", async (req, res) => {
  try {
    res.json(await scoreEssay(req.body || {}));
  } catch (error) {
    console.error("AI essay scoring failure:", error);
    res.status(200).json({ score: null, status: "pending_review" });
  }
});

module.exports = router;
