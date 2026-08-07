const router = require("express").Router();
const { getDb } = require("../config/database");
const { randomUUID } = require("crypto");

function readContent(key) {
  const row = getDb().prepare("SELECT payload FROM shared_content WHERE content_key=?").get(key);
  if (!row) return null;
  return JSON.parse(row.payload);
}

function writeContent(key, value, userId) {
  getDb().prepare("INSERT INTO shared_content (content_key,payload,updated_at,updated_by) VALUES (?,?,CURRENT_TIMESTAMP,?) ON CONFLICT(content_key) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at,updated_by=excluded.updated_by").run(key, JSON.stringify(value), userId);
}

function requireAdmin(req, res) { if (req.user.role !== "admin") { res.status(403).json({ error: "Administrator access is required." }); return false; } return true; }

function notifyStudentsOfNewContent(type, items) {
  if (!items.length) return;
  const db = getDb();
  const students = db.prepare("SELECT id FROM users WHERE role='student'").all();
  const insert = db.prepare("INSERT INTO user_notifications (id,user_id,payload) VALUES (?,?,?)");
  const timestamp = Date.now();

  for (const item of items) {
    const label = type === "new_exam" ? "exam" : "reviewer";
    for (const student of students) {
      insert.run(randomUUID(), student.id, JSON.stringify({
        id: randomUUID(),
        userId: student.id,
        type,
        message: `A new ${label} is available: ${item.title || "Untitled"}.`,
        isRead: false,
        timestamp,
        metadata: { contentId: item.id, contentType: label }
      }));
    }
  }
}

function saveCatalogAndNotify(key, items, userId, notificationType) {
  const previous = readContent(key) || [];
  const previousIds = new Set(previous.map((item) => item?.id).filter(Boolean));
  const newItems = items.filter((item) => item?.id && !previousIds.has(item.id) && item.status !== "draft");
  writeContent(key, items, userId);
  notifyStudentsOfNewContent(notificationType, newItems);
}

router.get("/reviewers", (_req, res) => {
  const record = getDb().prepare("SELECT payload FROM shared_content WHERE content_key='reviewers'").get();
  if (!record) return res.json({ reviewers: null });
  try {
    const reviewers = JSON.parse(record.payload);
    res.json({ reviewers: Array.isArray(reviewers) ? reviewers : [] });
  } catch (_error) {
    res.status(500).json({ error: "The shared reviewer catalog could not be read." });
  }
});

router.put("/reviewers", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const reviewers = req.body?.reviewers;
  if (!Array.isArray(reviewers)) return res.status(400).json({ error: "reviewers must be an array." });
  saveCatalogAndNotify("reviewers", reviewers, req.user.id, "new_reviewer");
  res.json({ reviewers });
});

router.get("/exams", (_req, res) => res.json({ exams: readContent("exams") }));
router.put("/exams", (req, res) => {
  if (!requireAdmin(req, res)) return;
  if (!Array.isArray(req.body?.exams)) return res.status(400).json({ error: "exams must be an array." });
  saveCatalogAndNotify("exams", req.body.exams, req.user.id, "new_exam"); res.json({ exams: req.body.exams });
});

router.get("/forum", (_req, res) => res.json({ threads: readContent("forum") || [] }));
router.post("/forum/threads", (req, res) => {
  const threads = readContent("forum") || [];
  const thread = { id: randomUUID(), title: String(req.body?.title || "").trim(), body: String(req.body?.body || "").trim(), tag: String(req.body?.tag || "Share Knowledge"), author: req.user.nickname || req.user.name || req.user.username || req.user.email, authorId: req.user.id, authorEmail: req.user.email, createdAt: new Date().toISOString(), replies: [], reactions: {} };
  if (!thread.title || !thread.body) return res.status(400).json({ error: "A title and post body are required." });
  writeContent("forum", [thread, ...threads], req.user.id); res.status(201).json({ thread, threads: [thread, ...threads] });
});
router.post("/forum/threads/:id/replies", (req, res) => {
  const threads = readContent("forum") || []; const body = String(req.body?.body || "").trim(); if (!body) return res.status(400).json({ error: "A reply is required." });
  const reply = { id: randomUUID(), author: req.user.nickname || req.user.name || req.user.username || req.user.email, authorId: req.user.id, authorEmail: req.user.email, body, createdAt: new Date().toISOString() };
  let ownerId = null; const updated = threads.map((thread) => { if (thread.id !== req.params.id) return thread; ownerId = thread.authorId; return { ...thread, replies: [...(thread.replies || []), reply] }; });
  if (!ownerId) return res.status(404).json({ error: "Forum post not found." }); writeContent("forum", updated, req.user.id);
  if (ownerId !== req.user.id) getDb().prepare("INSERT INTO user_notifications (id,user_id,payload) VALUES (?,?,?)").run(randomUUID(), ownerId, JSON.stringify({ id: randomUUID(), userId: ownerId, type: "new_reply", message: `${reply.author} replied to your post.`, isRead: false, timestamp: Date.now(), metadata: { threadId: req.params.id, replyId: reply.id } }));
  res.json({ reply, threads: updated });
});
router.post("/forum/threads/:id/reactions", (req, res) => {
  const threads = readContent("forum") || []; const type = String(req.body?.type || "like"); let ownerId = null; let active = false;
  const updated = threads.map((thread) => { if (thread.id !== req.params.id) return thread; ownerId = thread.authorId; const current = thread.reactions?.[type]; const ids = new Set(Array.isArray(current) ? current : current?.userIds || []); active = !ids.has(req.user.id); active ? ids.add(req.user.id) : ids.delete(req.user.id); return { ...thread, reactions: { ...(thread.reactions || {}), [type]: { count: ids.size, userIds: [...ids] } } }; });
  if (!ownerId) return res.status(404).json({ error: "Forum post not found." }); writeContent("forum", updated, req.user.id);
  if (active && ownerId !== req.user.id) getDb().prepare("INSERT INTO user_notifications (id,user_id,payload) VALUES (?,?,?)").run(randomUUID(), ownerId, JSON.stringify({ id: randomUUID(), userId: ownerId, type: "post_reaction", message: "Someone reacted to your post.", isRead: false, timestamp: Date.now(), metadata: { threadId: req.params.id, reactionType: type } }));
  res.json({ threads: updated });
});
router.get("/notifications", (req, res) => { const rows = getDb().prepare("SELECT payload FROM user_notifications WHERE user_id=? ORDER BY created_at DESC").all(req.user.id); res.json({ notifications: rows.map((row) => ({ ...JSON.parse(row.payload), userId: req.user.id })) }); });
router.patch("/notifications/read", (req, res) => {
  const notificationId = req.body?.notificationId;
  const db = getDb();
  const rows = notificationId
    ? db.prepare("SELECT id,payload FROM user_notifications WHERE user_id=?").all(req.user.id).filter((row) => JSON.parse(row.payload).id === notificationId)
    : db.prepare("SELECT id,payload FROM user_notifications WHERE user_id=?").all(req.user.id);
  const update = db.prepare("UPDATE user_notifications SET payload=? WHERE id=? AND user_id=?");
  rows.forEach((row) => update.run(JSON.stringify({ ...JSON.parse(row.payload), userId: req.user.id, isRead: true }), row.id, req.user.id));
  res.json({ updated: rows.length });
});

module.exports = router;
