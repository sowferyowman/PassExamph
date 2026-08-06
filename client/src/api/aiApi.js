import http from "./http";

export async function diagnoseExam(payload) {
  const { data } = await http.post("/ai/diagnose-exam", payload);
  return data;
}

export async function routeAdaptiveLearning(payload) {
  const { data } = await http.post("/ai/adaptive-gate", payload);
  return data;
}

export async function scoreEssay(payload) {
  const { data } = await http.post("/ai/score-essay", payload);
  return data;
}
