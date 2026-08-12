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
router.get("/sessions/active", async (req, res) => { try { res.json({ session: await sessions.getActiveExamSession(req.user.id) }); } catch (error) { sendError(res, error); } });
router.get("/sessions/:id", async (req, res) => { try { res.json(sessions.serialise(await sessions.getSession(req.params.id, req.user.id))); } catch (error) { sendError(res, error); } });
router.post("/sessions", async (req, res) => { try { res.status(201).json(await sessions.createExamSession(req.user.id, req.body || {})); } catch (error) { sendError(res, error); } });
router.post("/sessions/:id/start-section", async (req, res) => { try { res.json(await sessions.startSection(req.params.id, req.user.id, req.body?.sectionIndex)); } catch (error) { sendError(res, error); } });
router.patch("/sessions/:id/progress", async (req, res) => { try { res.json(await sessions.saveProgress(req.params.id, req.user.id, req.body || {})); } catch (error) { sendError(res, error); } });
router.post("/sessions/:id/advance", async (req, res) => { try { res.json(await sessions.advanceSection(req.params.id, req.user.id)); } catch (error) { sendError(res, error); } });
router.post("/sessions/:id/complete", async (req, res) => { try { res.json(await sessions.completeSession(req.params.id, req.user.id)); } catch (error) { sendError(res, error); } });
router.post("/sessions/:id/abandon", async (req, res) => { try { res.json(await sessions.abandonSession(req.params.id, req.user.id)); } catch (error) { sendError(res, error); } });

module.exports = router;
