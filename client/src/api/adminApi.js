import http from "./http";

export const getAdminStudents = () => http.get("/admin/students").then((response) => response.data);
export const updateAdminStudent = (studentId, payload) => http.patch(`/admin/students/${studentId}`, payload).then((response) => response.data);
export const deleteAdminStudent = (studentId) => http.delete(`/admin/students/${studentId}`).then((response) => response.data);
export const resetAdminStudentPassword = (studentId) => http.post(`/admin/students/${studentId}/reset-password`).then((response) => response.data);
