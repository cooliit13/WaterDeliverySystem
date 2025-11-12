import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true
});

// ✅ Attach JWT to every request
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// ✅ Handle 401 without forcing logout
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("Unauthorized or expired token");

      // Optional: Cleanup stored data
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }

    // ✅ Warn if request accidentally hits frontend port
    if (error.config?.url?.startsWith("http://localhost:5173")) {
      console.error("❌ Request misrouted to frontend dev server. Check baseURL or proxy config.");
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;