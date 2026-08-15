import http from "./http";

export const register = (payload) => http.post("/auth/register", payload).then((response) => response.data);
export const login = (identifier, password, rememberMe = false) => http.post("/auth/login", { identifier, password, rememberMe }).then((response) => response.data);
export const logout = () => http.post("/auth/logout").then((response) => response.data);
export const forgotPassword = (email) => http.post("/auth/forgot-password", { email }).then((response) => response.data);
export const me = () => http.get("/auth/me").then((response) => response.data);
export const changePassword = (payload) => http.post("/auth/change-password", payload).then((response) => response.data);
export const sessions = () => http.get("/auth/sessions").then((response) => response.data);
export const logoutAll = () => http.post("/auth/logout-all").then((response) => response.data);
export const requestSmsReset = (phoneNumber) => http.post("/auth/forgot-password-sms", { phoneNumber }).then((response) => response.data);
export const resetPasswordSms = (code, newPassword) => http.post("/auth/reset-password-sms", { code, newPassword }).then((response) => response.data);
export const requestEmailReset = (email) => http.post("/auth/forgot-password-email", { email }).then((response) => response.data);
export const resetPasswordEmail = (code, newPassword) => http.post("/auth/reset-password-email", { code, newPassword }).then((response) => response.data);
export const updateProfile = (payload) => http.patch("/auth/profile", payload).then((response) => response.data);
export const loginWithSupabaseGoogle = (accessToken) => http.post("/auth/supabase-google", { accessToken }).then((response) => response.data);
