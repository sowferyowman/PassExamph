const { randomUUID } = require("crypto");
const { getDb } = require("../config/database");

function normaliseDurations(value) {
  if (!Array.isArray(value) || !value.length) throw Object.assign(new Error("Section timing is required."), { status: 400 });
  return value.map((seconds) => {
    const duration = Math.floor(Number(seconds));
    if (!Number.isFinite(duration) || duration < 1 || duration > 6 * 60 * 60) throw Object.assign(new Error("Invalid section duration."), { status: 400 });
    return duration;
  });
}

function getSession(id, studentId) {
  const session = getDb().prepare("SELECT * FROM exam_sessions WHERE id=? AND student_id=?").get(id, studentId);
  if (!session) throw Object.assign(new Error("Exam session was not found."), { status: 404 });
  return session;
}

function timing(session, now = Date.now()) {
  const durations = JSON.parse(session.section_durations || "[]");
  const duration = Number(durations[session.active_section] || 0);
  const elapsedSeconds = session.status === "active" && session.section_started_at_ms
    ? Math.max(0, Math.floor((now - Number(session.section_started_at_ms)) / 1000))
    : 0;
  return { duration, remainingSeconds: session.status === "active" ? Math.max(0, duration - elapsedSeconds) : null, expired: session.status === "active" && elapsedSeconds >= duration };
}

function serialise(session, now = Date.now()) {
  return {
    id: session.id,
    examId: session.exam_id,
    responses: JSON.parse(session.responses || "[]"),
    activeSection: session.active_section,
    activeQuestion: session.active_question,
    status: session.status,
    serverNow: now,
    ...timing(session, now)
  };
}

function createExamSession(studentId, { examId, sectionDurations }) {
  if (!String(examId || "").trim()) throw Object.assign(new Error("Exam id is required."), { status: 400 });
  const now = Date.now();
  const session = {
    id: randomUUID(), studentId, examId: String(examId), durations: normaliseDurations(sectionDurations), now
  };
  const db = getDb();
  db.prepare("UPDATE exam_sessions SET status='abandoned', updated_at_ms=? WHERE student_id=? AND exam_id=? AND status IN ('overview','intermission','active')")
    .run(now, studentId, session.examId);
  db.prepare("INSERT INTO exam_sessions (id,student_id,exam_id,section_durations,responses,started_at_ms,updated_at_ms) VALUES (?,?,?,?,?,?,?)")
    .run(session.id, studentId, session.examId, JSON.stringify(session.durations), "[]", now, now);
  return serialise(getSession(session.id, studentId), now);
}

function getActiveExamSession(studentId) {
  const session = getDb().prepare("SELECT * FROM exam_sessions WHERE student_id=? AND status IN ('overview','intermission','active') ORDER BY updated_at_ms DESC LIMIT 1").get(studentId);
  return session ? serialise(session) : null;
}

function startSection(id, studentId, sectionIndex) {
  const session = getSession(id, studentId);
  const index = Number(sectionIndex);
  if (!Number.isInteger(index) || index !== session.active_section) throw Object.assign(new Error("This is not the active exam section."), { status: 409 });
  const now = Date.now();
  if (session.status !== "active") getDb().prepare("UPDATE exam_sessions SET status='active', section_started_at_ms=?, updated_at_ms=? WHERE id=?").run(now, now, id);
  return serialise(getSession(id, studentId), now);
}

function saveProgress(id, studentId, { responses, activeSection, activeQuestion }) {
  const session = getSession(id, studentId);
  if (!["overview", "intermission", "active"].includes(session.status)) return serialise(session);
  if (timing(session).expired) return serialise(session);
  const section = Number(activeSection);
  const question = Number(activeQuestion);
  if (!Number.isInteger(section) || section !== session.active_section || !Number.isInteger(question) || question < 0) throw Object.assign(new Error("Invalid exam position."), { status: 400 });
  const safeResponses = Array.isArray(responses) ? responses : JSON.parse(session.responses || "[]");
  const now = Date.now();
  getDb().prepare("UPDATE exam_sessions SET responses=?, active_question=?, updated_at_ms=? WHERE id=?").run(JSON.stringify(safeResponses), question, now, id);
  return serialise(getSession(id, studentId), now);
}

function advanceSection(id, studentId) {
  const session = getSession(id, studentId);
  const now = Date.now();
  const durations = JSON.parse(session.section_durations || "[]");
  const nextSection = session.active_section + 1;
  if (nextSection >= durations.length) return completeSession(id, studentId);
  getDb().prepare("UPDATE exam_sessions SET active_section=?, active_question=0, status='intermission', section_started_at_ms=NULL, updated_at_ms=? WHERE id=?")
    .run(nextSection, now, id);
  return serialise(getSession(id, studentId), now);
}

function completeSession(id, studentId) {
  const session = getSession(id, studentId);
  const now = Date.now();
  if (session.status !== "completed") getDb().prepare("UPDATE exam_sessions SET status='completed', completed_at_ms=?, updated_at_ms=? WHERE id=?").run(now, now, id);
  return serialise(getSession(id, studentId), now);
}

module.exports = { createExamSession, getActiveExamSession, startSection, saveProgress, advanceSection, completeSession, getSession, serialise };
