const router = require("express").Router();
const { getDb } = require("../config/database");

router.get("/:namespace", (req, res) => {
  const rows = getDb().prepare("SELECT data_key AS key, payload, updated_at AS updatedAt FROM app_data WHERE user_id=? AND namespace=? ORDER BY data_key").all(req.user.id, req.params.namespace);
  res.json(rows.map((row) => ({ ...row, value: JSON.parse(row.payload) })));
});

router.post("/migrate", (req, res) => {
  const records = Array.isArray(req.body?.records) ? req.body.records : [];
  const insert = getDb().prepare(`INSERT INTO app_data (user_id, namespace, data_key, payload, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(user_id, namespace, data_key) DO UPDATE SET payload=excluded.payload, updated_at=CURRENT_TIMESTAMP`);
  for (const record of records) if (record.namespace && record.key && record.value !== undefined) insert.run(req.user.id, record.namespace, record.key, JSON.stringify(record.value));
  res.json({ migrated: records.length });
});

router.put("/:namespace/:key", (req, res) => {
  const value = req.body?.value;
  if (value === undefined) return res.status(400).json({ error: "value is required" });
  getDb().prepare(`INSERT INTO app_data (user_id, namespace, data_key, payload, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(user_id, namespace, data_key) DO UPDATE SET payload=excluded.payload, updated_at=CURRENT_TIMESTAMP`).run(req.user.id, req.params.namespace, req.params.key, JSON.stringify(value));
  res.json({ namespace: req.params.namespace, key: req.params.key, value });
});

router.delete("/:namespace/:key", (req, res) => { getDb().prepare("DELETE FROM app_data WHERE user_id=? AND namespace=? AND data_key=?").run(req.user.id, req.params.namespace, req.params.key); res.json({ ok: true }); });

module.exports = router;
