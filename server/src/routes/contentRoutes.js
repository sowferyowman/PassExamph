const router = require("express").Router();
const { pool } = require("../config/database.pg");
const { randomUUID } = require("crypto");

async function readContent(key) {
  const row = (await pool.query("SELECT payload FROM shared_content WHERE content_key = $1", [key])).rows[0];
  if (!row) return null;
  return typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
}

async function writeContent(key, value, userId) {
  await pool.query("INSERT INTO shared_content (content_key,payload,updated_at,updated_by) VALUES ($1,$2,CURRENT_TIMESTAMP,$3) ON CONFLICT(content_key) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at,updated_by=excluded.updated_by", [key, JSON.stringify(value), userId]);
}

function requireAdmin(req, res) { if (req.user.role !== "admin") { res.status(403).json({ error: "Administrator access is required." }); return false; } return true; }
function userId(req) { return Number(req.user.id); }

async function notifyStudentsOfNewContent(type, items) {
  if (!items.length) return;
  const students = (await pool.query("SELECT id FROM users WHERE role = $1", ["student"])).rows;
  const timestamp = Date.now();

  for (const item of items) {
    const label = type === "new_exam" ? "exam" : "reviewer";
    for (const student of students) {
      const studentId = Number(student.id);
      await pool.query("INSERT INTO user_notifications (id,user_id,payload) VALUES ($1,$2,$3)", [randomUUID(), studentId, JSON.stringify({
        id: randomUUID(),
        userId: studentId,
        type,
        message: `A new ${label} is available: ${item.title || "Untitled"}.`,
        isRead: false,
        timestamp,
        metadata: { contentId: item.id, contentType: label }
      })]);
    }
  }
}

async function saveCatalogAndNotify(key, items, userId, notificationType) {
  const previous = await readContent(key) || [];
  const previousIds = new Set(previous.map((item) => item?.id).filter(Boolean));
  const newItems = items.filter((item) => item?.id && !previousIds.has(item.id) && item.status !== "draft");
  await writeContent(key, items, userId);
  await notifyStudentsOfNewContent(notificationType, newItems);
}

router.get("/reviewers", async (_req, res, next) => {
  try {
    const record = (await pool.query("SELECT payload FROM shared_content WHERE content_key = $1", ["reviewers"])).rows[0];
    if (!record) return res.json({ reviewers: null });
    const reviewers = typeof record.payload === "string" ? JSON.parse(record.payload) : record.payload;
    res.json({ reviewers: Array.isArray(reviewers) ? reviewers : [] });
  } catch (_error) {
    if (_error instanceof SyntaxError) return res.status(500).json({ error: "The shared reviewer catalog could not be read." });
    next(_error);
  }
});

router.put("/reviewers", async (req, res, next) => {
  if (!requireAdmin(req, res)) return;
  const reviewers = req.body?.reviewers;
  if (!Array.isArray(reviewers)) return res.status(400).json({ error: "reviewers must be an array." });
  try {
    await saveCatalogAndNotify("reviewers", reviewers, userId(req), "new_reviewer");
    res.json({ reviewers });
  } catch (error) {
    next(error);
  }
});

router.get("/exams", async (_req, res, next) => {
  try {
    res.json({ exams: await readContent("exams") });
  } catch (error) {
    next(error);
  }
});
router.put("/exams", async (req, res, next) => {
  if (!requireAdmin(req, res)) return;
  if (!Array.isArray(req.body?.exams)) return res.status(400).json({ error: "exams must be an array." });
  try {
    await saveCatalogAndNotify("exams", req.body.exams, userId(req), "new_exam");
    res.json({ exams: req.body.exams });
  } catch (error) {
    next(error);
  }
});

router.get("/forum", async (_req, res, next) => {
  try {
    res.json({ threads: await readContent("forum") || [] });
  } catch (error) {
    next(error);
  }
});
router.post("/forum/threads", async (req, res, next) => {
  let threads;
  try {
    threads = await readContent("forum") || [];
  } catch (error) {
    return next(error);
  }
  const currentUserId = userId(req);
  const thread = { id: randomUUID(), title: String(req.body?.title || "").trim(), body: String(req.body?.body || "").trim(), tag: String(req.body?.tag || "Share Knowledge"), author: req.user.nickname || req.user.name || req.user.username || req.user.email, authorId: currentUserId, authorEmail: req.user.email, createdAt: new Date().toISOString(), replies: [], reactions: {} };
  if (!thread.title || !thread.body) return res.status(400).json({ error: "A title and post body are required." });
  try {
    await writeContent("forum", [thread, ...threads], currentUserId);
    res.status(201).json({ thread, threads: [thread, ...threads] });
  } catch (error) {
    next(error);
  }
});
router.post("/forum/threads/:id/replies", async (req, res, next) => {
  let threads;
  try {
    threads = await readContent("forum") || [];
  } catch (error) {
    return next(error);
  }
  const body = String(req.body?.body || "").trim(); if (!body) return res.status(400).json({ error: "A reply is required." });
  const currentUserId = userId(req);
  const reply = { id: randomUUID(), author: req.user.nickname || req.user.name || req.user.username || req.user.email, authorId: currentUserId, authorEmail: req.user.email, body, createdAt: new Date().toISOString() };
  let ownerId = null; const updated = threads.map((thread) => { if (thread.id !== req.params.id) return thread; ownerId = thread.authorId; return { ...thread, replies: [...(thread.replies || []), reply] }; });
  if (!ownerId) return res.status(404).json({ error: "Forum post not found." });
  try {
    await writeContent("forum", updated, currentUserId);
    if (ownerId !== currentUserId) await pool.query("INSERT INTO user_notifications (id,user_id,payload) VALUES ($1,$2,$3)", [randomUUID(), ownerId, JSON.stringify({ id: randomUUID(), userId: ownerId, type: "new_reply", message: `${reply.author} replied to your post.`, isRead: false, timestamp: Date.now(), metadata: { threadId: req.params.id, replyId: reply.id } })]);
    res.json({ reply, threads: updated });
  } catch (error) {
    next(error);
  }
});
router.post("/forum/threads/:id/reactions", async (req, res, next) => {
  let threads;
  try {
    threads = await readContent("forum") || [];
  } catch (error) {
    return next(error);
  }
  const currentUserId = userId(req);
  const type = String(req.body?.type || "like"); let ownerId = null; let active = false;
  const updated = threads.map((thread) => { if (thread.id !== req.params.id) return thread; ownerId = thread.authorId; const current = thread.reactions?.[type]; const ids = new Set(Array.isArray(current) ? current : current?.userIds || []); active = !ids.has(currentUserId); active ? ids.add(currentUserId) : ids.delete(currentUserId); return { ...thread, reactions: { ...(thread.reactions || {}), [type]: { count: ids.size, userIds: [...ids] } } }; });
  if (!ownerId) return res.status(404).json({ error: "Forum post not found." });
  try {
    await writeContent("forum", updated, currentUserId);
    if (active && ownerId !== currentUserId) await pool.query("INSERT INTO user_notifications (id,user_id,payload) VALUES ($1,$2,$3)", [randomUUID(), ownerId, JSON.stringify({ id: randomUUID(), userId: ownerId, type: "post_reaction", message: "Someone reacted to your post.", isRead: false, timestamp: Date.now(), metadata: { threadId: req.params.id, reactionType: type } })]);
    res.json({ threads: updated });
  } catch (error) {
    next(error);
  }
});
router.get("/notifications", async (req, res, next) => {
  try {
    const currentUserId = userId(req);
    const rows = (await pool.query("SELECT payload FROM user_notifications WHERE user_id = $1 ORDER BY created_at DESC", [currentUserId])).rows;
    res.json({ notifications: rows.map((row) => ({ ...(typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload), userId: currentUserId })) });
  } catch (error) {
    next(error);
  }
});
router.patch("/notifications/read", async (req, res, next) => {
  const notificationId = req.body?.notificationId;
  try {
    const currentUserId = userId(req);
    const allRows = (await pool.query("SELECT id,payload FROM user_notifications WHERE user_id = $1", [currentUserId])).rows;
    const rows = notificationId
      ? allRows.filter((row) => (typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload).id === notificationId)
      : allRows;
    for (const row of rows) {
      const payload = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
      await pool.query("UPDATE user_notifications SET payload = $1 WHERE id = $2 AND user_id = $3", [JSON.stringify({ ...payload, userId: currentUserId, isRead: true }), row.id, currentUserId]);
    }
    res.json({ updated: rows.length });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
