import http from "./http";

export async function createExamSession(payload) { const { data } = await http.post("/exams/sessions", payload); return data; }
export async function getActiveExamSession() { const { data } = await http.get("/exams/sessions/active"); return data.session; }
export async function syncExamSession(id) { const { data } = await http.get(`/exams/sessions/${id}`); return data; }
export async function startExamSection(id, sectionIndex) { const { data } = await http.post(`/exams/sessions/${id}/start-section`, { sectionIndex }); return data; }
export async function saveExamProgress(id, payload) { const { data } = await http.patch(`/exams/sessions/${id}/progress`, payload); return data; }
export async function advanceExamSection(id) { const { data } = await http.post(`/exams/sessions/${id}/advance`); return data; }
export async function completeExamSession(id) { const { data } = await http.post(`/exams/sessions/${id}/complete`); return data; }
export async function abandonExamSession(id) { const { data } = await http.post(`/exams/sessions/${id}/abandon`); return data; }
