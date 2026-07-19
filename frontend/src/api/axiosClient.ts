import axios from "axios";
import { clearCurrentUser } from "./tokenStore";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? "http://localhost:3000" : "");

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });

        return axiosClient(originalRequest);
      } catch {
        clearCurrentUser();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default axiosClient;
