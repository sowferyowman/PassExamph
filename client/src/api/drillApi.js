import http from "./http";

export async function loadDrillSessions() {
  const { data } = await http.get("/drills/sessions");
  return data;
}

export async function saveDrillSessionToApi(session) {
  const { data } = await http.post("/drills/sessions", session);
  return data;
}
