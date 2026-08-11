const router = require("express").Router();
const { getExamBlueprint, scoreExamAttempt } = require("../services/examService");
const sessions = require("../services/examSessionService");

router.get("/blueprint", async (_req, res, next) => {
  try { res.json(await getExamBlueprint()); } catch (error) { next(error); }
});

router.post("/attempts", async (req, res, next) => {
  try { res.status(201).json(await scoreExamAttempt(req.body.responses || [], req.user.id)); } catch (error) { next(error); }
});

function sendError(res, error) { res.status(error.status || 400).json({ error: error.message || "Unable to update exam session." }); }
router.get("/sessions/active", (req, res) => { res.json({ session: sessions.getActiveExamSession(req.user.id) }); });
router.get("/sessions/:id", (req, res) => { try { res.json(sessions.serialise(sessions.getSession(req.params.id, req.user.id))); } catch (error) { sendError(res, error); } });
router.post("/sessions", (req, res) => { try { res.status(201).json(sessions.createExamSession(req.user.id, req.body || {})); } catch (error) { sendError(res, error); } });
router.post("/sessions/:id/start-section", (req, res) => { try { res.json(sessions.startSection(req.params.id, req.user.id, req.body?.sectionIndex)); } catch (error) { sendError(res, error); } });
router.patch("/sessions/:id/progress", (req, res) => { try { res.json(sessions.saveProgress(req.params.id, req.user.id, req.body || {})); } catch (error) { sendError(res, error); } });
router.post("/sessions/:id/advance", (req, res) => { try { res.json(sessions.advanceSection(req.params.id, req.user.id)); } catch (error) { sendError(res, error); } });
router.post("/sessions/:id/complete", (req, res) => { try { res.json(sessions.completeSession(req.params.id, req.user.id)); } catch (error) { sendError(res, error); } });
router.post("/sessions/:id/abandon", (req, res) => { try { res.json(sessions.abandonSession(req.params.id, req.user.id)); } catch (error) { sendError(res, error); } });

module.exports = router;
