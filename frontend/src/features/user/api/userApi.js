import { apiClient } from "@/services/http/apiClient";
import { ENDPOINTS } from "@/services/endpoints";

export async function fetchUsersApi() {
  const { data } = await apiClient.get(ENDPOINTS.user.list);
  return data;
}
