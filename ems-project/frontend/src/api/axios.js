import axios from "axios";

// Backend root (used for API calls and for uploaded payment screenshots)
export const BACKEND_URL = "http://localhost:5000";


const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ems_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
