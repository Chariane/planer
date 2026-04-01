import axios from "axios";
import { toast } from "react-toastify";
import { getAccessToken, clearSession } from "@/utils/helpers/storage";
import { mapApiError } from "@/errors/errorMapper";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const mapped = mapApiError(error);

    if (mapped.statusCode === 401) {
      clearSession();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("kplaner:logout"));
      }
    }

    toast.error(mapped.message);
    return Promise.reject(mapped);
  }
);
