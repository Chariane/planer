import { apiClient } from "@/services/http/apiClient";
import { ENDPOINTS } from "@/services/endpoints";

export async function registerApi(payload) {
  const { data } = await apiClient.post(ENDPOINTS.auth.register, payload);
  return data;
}

export async function loginApi(payload) {
  const { data } = await apiClient.post(ENDPOINTS.auth.login, payload);
  return data;
}

export async function meApi() {
  const { data } = await apiClient.get(ENDPOINTS.auth.me);
  return data;
}
