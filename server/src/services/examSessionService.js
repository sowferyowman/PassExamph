const { randomUUID } = require("crypto");
const { pool } = require("../config/database.pg");

function normaliseDurations(value) {
  if (!Array.isArray(value) || !value.length) throw Object.assign(new Error("Section timing is required."), { status: 400 });
  return value.map((seconds) => {
    const duration = Math.floor(Number(seconds));
    if (!Number.isFinite(duration) || duration < 1 || duration > 6 * 60 * 60) throw Object.assign(new Error("Invalid section duration."), { status: 400 });
    return duration;
  });
}

async function getSession(id, studentId) {
  const session = (await pool.query("SELECT * FROM exam_sessions WHERE id = $1 AND student_id = $2", [id, studentId])).rows[0];
  if (!session) throw Object.assign(new Error("Exam session was not found."), { status: 404 });
  return session;
}

function timing(session, now = Date.now()) {
  const durations = typeof session.section_durations === "string" ? JSON.parse(session.section_durations || "[]") : session.section_durations || [];
  const activeSection = Number(session.active_section);
  const duration = Number(durations[activeSection] || 0);
  const elapsedSeconds = session.status === "active" && session.section_started_at_ms
    ? Math.max(0, Math.floor((now - Number(session.section_started_at_ms)) / 1000))
    : 0;
  return { duration, remainingSeconds: session.status === "active" ? Math.max(0, duration - elapsedSeconds) : null, expired: session.status === "active" && elapsedSeconds >= duration };
}

function serialise(session, now = Date.now()) {
  return {
    id: session.id,
    examId: session.exam_id,
    responses: typeof session.responses === "string" ? JSON.parse(session.responses || "[]") : session.responses || [],
    activeSection: Number(session.active_section),
    activeQuestion: Number(session.active_question),
    status: session.status,
    serverNow: now,
    ...timing(session, now)
  };
}

async function createExamSession(studentId, { examId, sectionDurations }) {
  if (!String(examId || "").trim()) throw Object.assign(new Error("Exam id is required."), { status: 400 });
  const now = Date.now();
  const session = {
    id: randomUUID(), studentId, examId: String(examId), durations: normaliseDurations(sectionDurations), now
  };
  await pool.query("UPDATE exam_sessions SET status = 'abandoned', updated_at_ms = $1 WHERE student_id = $2 AND exam_id = $3 AND status IN ('overview','intermission','active')", [now, studentId, session.examId]);
  await pool.query("INSERT INTO exam_sessions (id,student_id,exam_id,section_durations,responses,started_at_ms,updated_at_ms) VALUES ($1,$2,$3,$4,$5,$6,$7)", [session.id, studentId, session.examId, JSON.stringify(session.durations), "[]", now, now]);
  return serialise(await getSession(session.id, studentId), now);
}

async function getActiveExamSession(studentId) {
  const session = (await pool.query("SELECT * FROM exam_sessions WHERE student_id = $1 AND status IN ('overview','intermission','active') ORDER BY updated_at_ms DESC LIMIT 1", [studentId])).rows[0];
  return session ? serialise(session) : null;
}

async function startSection(id, studentId, sectionIndex) {
  const session = await getSession(id, studentId);
  const index = Number(sectionIndex);
  if (!Number.isInteger(index) || index !== Number(session.active_section)) throw Object.assign(new Error("This is not the active exam section."), { status: 409 });
  const now = Date.now();
  if (session.status !== "active") await pool.query("UPDATE exam_sessions SET status = 'active', section_started_at_ms = $1, updated_at_ms = $2 WHERE id = $3", [now, now, id]);
  return serialise(await getSession(id, studentId), now);
}

async function saveProgress(id, studentId, { responses, activeSection, activeQuestion }) {
  const session = await getSession(id, studentId);
  if (!["overview", "intermission", "active"].includes(session.status)) return serialise(session);
  const section = Number(activeSection);
  const question = Number(activeQuestion);
  if (!Number.isInteger(section) || section !== Number(session.active_section) || !Number.isInteger(question) || question < 0) throw Object.assign(new Error("Invalid exam position."), { status: 400 });
  const safeResponses = Array.isArray(responses) ? responses : (typeof session.responses === "string" ? JSON.parse(session.responses || "[]") : session.responses || []);
  const now = Date.now();
  await pool.query("UPDATE exam_sessions SET responses = $1, active_question = $2, updated_at_ms = $3 WHERE id = $4", [JSON.stringify(safeResponses), question, now, id]);
  return serialise(await getSession(id, studentId), now);
}

async function advanceSection(id, studentId) {
  const session = await getSession(id, studentId);
  const now = Date.now();
  const durations = typeof session.section_durations === "string" ? JSON.parse(session.section_durations || "[]") : session.section_durations || [];
  const nextSection = Number(session.active_section) + 1;
  if (nextSection >= durations.length) return completeSession(id, studentId);
  await pool.query("UPDATE exam_sessions SET active_section = $1, active_question = 0, status = 'intermission', section_started_at_ms = NULL, updated_at_ms = $2 WHERE id = $3", [nextSection, now, id]);
  return serialise(await getSession(id, studentId), now);
}

async function completeSession(id, studentId) {
  const session = await getSession(id, studentId);
  const now = Date.now();
  if (session.status !== "completed") await pool.query("UPDATE exam_sessions SET status = 'completed', completed_at_ms = $1, updated_at_ms = $2 WHERE id = $3", [now, now, id]);
  return serialise(await getSession(id, studentId), now);
}

async function abandonSession(id, studentId) {
  const session = await getSession(id, studentId);
  const now = Date.now();
  if (["overview", "intermission", "active"].includes(session.status)) {
    await pool.query("UPDATE exam_sessions SET status = 'abandoned', updated_at_ms = $1 WHERE id = $2", [now, id]);
  }
  return serialise(await getSession(id, studentId), now);
}

module.exports = { createExamSession, getActiveExamSession, startSection, saveProgress, advanceSection, completeSession, abandonSession, getSession, serialise };
