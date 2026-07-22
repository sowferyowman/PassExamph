import axios from "axios";

const http = axios.create({
  baseURL: "/api",
  withCredentials: true
});

let refreshing = null;
http.interceptors.response.use((response) => response, async (error) => {
  const request = error.config;
  if (error.response?.status === 401 && !request?._retry && !request?.url?.includes("/auth/refresh")) {
    request._retry = true;
    try {
      refreshing ||= http.post("/auth/refresh");
      await refreshing;
      refreshing = null;
      return http(request);
    } catch (refreshError) {
      refreshing = null;
      return Promise.reject(refreshError);
    }
  }
  return Promise.reject(error);
});

export default http;
